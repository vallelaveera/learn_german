import { callClaude, parseJsonArray } from "./generate";
import type { WordInput } from "@/lib/vocab/types";
import { countGermanWords, isWithinWordLimit, MAX_VOCAB_WORDS } from "./vocab-word-count";

interface ValidationResult {
  id: number;
  passed: boolean;
  corrections: {
    de: string | null;
    en: string | null;
    distractors: string[] | null;
  };
  issues: string[];
  levelAccurate: boolean;
}

export interface ValidateWordsOutput {
  passed: WordInput[];
  rejected: { word: WordInput; issues: string[] }[];
}

/** Keep batches small — 50 entries in one validation response truncates at max_tokens. */
const VALIDATION_BATCH_SIZE = 12;
const VALIDATION_MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `You are a strict German vocabulary checker for a language learning flashcard app.
Every entry must be perfect — no errors allowed.

For each entry check:
1. German spelling and grammar (correct article, gender, plural if shown)
2. Natural vocabulary — would a native speaker use this word/phrase?
3. Level accuracy — does it match the stated CEFR level?
4. English translation accuracy
5. Distractors — exactly 2, plausible but wrong, not duplicates of the correct answer
6. Length — German entry must be at most ${MAX_VOCAB_WORDS} words; reject full sentences

Output ONLY valid JSON array, no markdown, no commentary.
Use "id" matching the index in the input list (0, 1, 2, …).
[
  {
    "id": 0,
    "passed": true | false,
    "corrections": {
      "de": "corrected German if wrong, null if correct",
      "en": "corrected English if wrong, null if correct",
      "distractors": ["d1", "d2"] or null if correct
    },
    "issues": ["list of issues found, empty if none"],
    "levelAccurate": true | false
  }
]

Be strict. If you are even slightly unsure, mark passed: false.`;

function hasValidDistractors(en: string, distractors: string[]): boolean {
  if (distractors.length !== 2) return false;
  const correct = en.toLowerCase().trim();
  return distractors.every(d => d.trim().length > 0 && d.toLowerCase().trim() !== correct);
}

async function validateWordsBatch(
  words: WordInput[],
  batchLabel: string,
): Promise<ValidateWordsOutput> {
  const passed: WordInput[] = [];
  const rejected: ValidateWordsOutput["rejected"] = [];

  try {
    const userPrompt = `Check these ${words.length} vocabulary entries. Each German entry must be at most ${MAX_VOCAB_WORDS} words.\n${JSON.stringify(words)}`;
    const text = await callClaude(SYSTEM_PROMPT, userPrompt, VALIDATION_MAX_TOKENS);
    const results = parseJsonArray<ValidationResult>(text);

    if (!results) {
      console.error(`[validate-words] JSON parse failed (${batchLabel}):`, text.slice(0, 500));
      for (const word of words) {
        rejected.push({ word, issues: ["Validation response parse failed"] });
        console.warn("[validate-words] REJECTED", JSON.stringify({ de: word.de, en: word.en, issues: ["Validation response parse failed"] }));
      }
      return { passed, rejected };
    }

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const result = results.find(r => r.id === i) ?? results[i];

      if (!result) {
        rejected.push({ word, issues: ["No validation result returned"] });
        console.warn("[validate-words] REJECTED", JSON.stringify({ de: word.de, en: word.en, issues: ["No validation result returned"] }));
        continue;
      }

      const issues = result.issues ?? [];

      if (!result.passed || !result.levelAccurate) {
        const allIssues = [...issues];
        if (!result.levelAccurate && !allIssues.some(issue => /level/i.test(issue))) {
          allIssues.push("Level accuracy check failed");
        }
        rejected.push({ word, issues: allIssues });
        console.warn("[validate-words] REJECTED", JSON.stringify({ de: word.de, en: word.en, issues: allIssues }));
        continue;
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
        continue;
      }

      if (!hasValidDistractors(corrected.en, corrected.distractors)) {
        const distIssues = ["Invalid distractors — need exactly 2 distinct wrong English options"];
        rejected.push({ word: corrected, issues: distIssues });
        console.warn("[validate-words] REJECTED", JSON.stringify({ de: corrected.de, en: corrected.en, issues: distIssues }));
        continue;
      }

      passed.push(corrected);
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
