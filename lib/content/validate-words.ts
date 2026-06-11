import { callClaude, parseJsonArray } from "./generate";
import type { WordInput } from "@/lib/vocab/types";
import { countGermanWords, isWithinWordLimit, MAX_VOCAB_WORDS } from "./vocab-word-count";
import {
  validationResultMatchesWord,
  WORD_VALIDATION_SYSTEM_PROMPT,
  type WordValidationResult,
} from "./word-validation-prompt";

export interface ValidateWordsOutput {
  passed: WordInput[];
  rejected: { word: WordInput; issues: string[] }[];
}

/** Small batches + single-word retry reduce cross-entry mix-ups. */
const VALIDATION_BATCH_SIZE = 8;
const VALIDATION_MAX_TOKENS = 8192;

function hasValidDistractors(en: string, distractors: string[]): boolean {
  if (distractors.length !== 2) return false;
  const correct = en.toLowerCase().trim();
  return distractors.every(d => d.trim().length > 0 && d.toLowerCase().trim() !== correct);
}

function applyValidationResult(
  word: WordInput,
  result: WordValidationResult,
  passed: WordInput[],
  rejected: ValidateWordsOutput["rejected"],
): void {
  const issues = result.issues ?? [];

  if (!result.passed || !result.levelAccurate) {
    const allIssues = [...issues];
    if (!result.levelAccurate && !allIssues.some(issue => /level/i.test(issue))) {
      allIssues.push("Level accuracy check failed");
    }
    rejected.push({ word, issues: allIssues });
    console.warn("[validate-words] REJECTED", JSON.stringify({ de: word.de, en: word.en, issues: allIssues }));
    return;
  }

  const corrected: WordInput = {
    ...word,
    de: result.corrections?.de ?? word.de,
    en: result.corrections?.en ?? word.en,
    distractors: result.corrections?.distractors ?? word.distractors,
  };

  if (!isWithinWordLimit(corrected.de)) {
    const lengthIssues = [`Too long: ${countGermanWords(corrected.de)} words (max ${MAX_VOCAB_WORDS})`];
    rejected.push({ word: corrected, issues: lengthIssues });
    console.warn("[validate-words] REJECTED", JSON.stringify({ de: corrected.de, en: corrected.en, issues: lengthIssues }));
    return;
  }

  if (!hasValidDistractors(corrected.en, corrected.distractors)) {
    const distIssues = ["Invalid distractors — need exactly 2 distinct wrong English options"];
    rejected.push({ word: corrected, issues: distIssues });
    console.warn("[validate-words] REJECTED", JSON.stringify({ de: corrected.de, en: corrected.en, issues: distIssues }));
    return;
  }

  passed.push(corrected);
}

async function validateWordSingle(word: WordInput, label: string): Promise<WordValidationResult | null> {
  try {
    const userPrompt = `Check this ONE vocabulary entry. Return a JSON array with exactly one object.\n${JSON.stringify([word])}`;
    const text = await callClaude(WORD_VALIDATION_SYSTEM_PROMPT, userPrompt, 2048);
    const results = parseJsonArray<WordValidationResult>(text);
    const result = results?.find(r => validationResultMatchesWord(r, word.de, 0)) ?? results?.[0];
    if (!result || !validationResultMatchesWord(result, word.de, 0)) {
      console.error(`[validate-words] single retry failed (${label}):`, text.slice(0, 300));
      return null;
    }
    return result;
  } catch (e) {
    console.error(`[validate-words] single retry call failed (${label}):`, e);
    return null;
  }
}

async function resolveValidationResult(
  word: WordInput,
  index: number,
  results: WordValidationResult[] | null,
  batchLabel: string,
): Promise<WordValidationResult | null> {
  const batchResult = results?.find(r => validationResultMatchesWord(r, word.de, index)) ?? results?.[index];
  if (batchResult && validationResultMatchesWord(batchResult, word.de, index)) {
    return batchResult;
  }
  return validateWordSingle(word, `${batchLabel}, single retry`);
}

async function validateWordsBatch(
  words: WordInput[],
  batchLabel: string,
): Promise<ValidateWordsOutput> {
  const passed: WordInput[] = [];
  const rejected: ValidateWordsOutput["rejected"] = [];

  try {
    const userPrompt = `Check these ${words.length} vocabulary entries. Each German entry must be at most ${MAX_VOCAB_WORDS} words.\n${JSON.stringify(words)}`;
    const text = await callClaude(WORD_VALIDATION_SYSTEM_PROMPT, userPrompt, VALIDATION_MAX_TOKENS);
    const results = parseJsonArray<WordValidationResult>(text);

    if (!results) {
      console.error(`[validate-words] JSON parse failed (${batchLabel}):`, text.slice(0, 500));
      for (const word of words) {
        const single = await validateWordSingle(word, `${batchLabel}, parse fallback`);
        if (single) {
          applyValidationResult(word, single, passed, rejected);
        } else {
          rejected.push({ word, issues: ["Validation response parse failed"] });
          console.warn("[validate-words] REJECTED", JSON.stringify({ de: word.de, en: word.en, issues: ["Validation response parse failed"] }));
        }
      }
      return { passed, rejected };
    }

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const result = await resolveValidationResult(word, i, results, batchLabel);

      if (!result) {
        rejected.push({ word, issues: ["No validation result returned"] });
        console.warn("[validate-words] REJECTED", JSON.stringify({ de: word.de, en: word.en, issues: ["No validation result returned"] }));
        continue;
      }

      applyValidationResult(word, result, passed, rejected);
    }
  } catch (e) {
    console.error(`[validate-words] Claude call failed (${batchLabel}):`, e);
    for (const word of words) {
      rejected.push({ word, issues: ["Validation call failed"] });
      console.warn("[validate-words] REJECTED", JSON.stringify({ de: word.de, en: word.en, issues: ["Validation call failed"] }));
    }
  }

  return { passed, rejected };
}

export async function validateWords(words: WordInput[]): Promise<ValidateWordsOutput> {
  if (words.length === 0) {
    return { passed: [], rejected: [] };
  }

  const passed: WordInput[] = [];
  const rejected: ValidateWordsOutput["rejected"] = [];

  for (let offset = 0; offset < words.length; offset += VALIDATION_BATCH_SIZE) {
    const batch = words.slice(offset, offset + VALIDATION_BATCH_SIZE);
    const batchNum = Math.floor(offset / VALIDATION_BATCH_SIZE) + 1;
    const { passed: batchPassed, rejected: batchRejected } = await validateWordsBatch(
      batch,
      `batch ${batchNum}, ${batch.length} items`,
    );
    passed.push(...batchPassed);
    rejected.push(...batchRejected);
  }

  return { passed, rejected };
}
