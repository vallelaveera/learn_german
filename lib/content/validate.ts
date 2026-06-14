import { parseJsonArray } from "./generate";
import { callAdminLlm, type AdminLlmProvider } from "./llm-provider";
import type { SentenceInput } from "@/lib/vocab/types";
import { countGermanWords, isWithinWordLimit, MAX_GERMAN_WORDS } from "./word-count";

interface ValidationResult {
  id: number;
  passed: boolean;
  corrections: {
    de: string | null;
    en: string | null;
  };
  issues: string[];
  levelAccurate: boolean;
}

export interface ValidateOutput {
  passed: SentenceInput[];
  rejected: { sentence: SentenceInput; issues: string[] }[];
}

const SYSTEM_PROMPT = `You are a strict German grammar and spelling checker for a language learning app.
Every sentence must be perfect — no errors allowed.

Reject invented, unnatural, or textbook-atypical content:
- Reject if the sentence sounds AI-invented, overly literary, or not like standard ${MAX_GERMAN_WORDS}-word classroom German
- Reject dialect, slang, brand names, or vocabulary above the stated CEFR level
- Reject if English translation does not match German meaning

For each sentence check:
1. German spelling — every word correctly spelled
2. Grammar — correct case, gender, verb conjugation, word order
3. Natural language — would a native teacher use this in a Goethe/telc prep class?
4. Level accuracy — does vocabulary and grammar actually match the stated CEFR level?
5. Translation accuracy — does English match German?
6. Length — reject ONLY if German has MORE than ${MAX_GERMAN_WORDS} words. Sentences with 9–${MAX_GERMAN_WORDS} words are fine. Do not miscount articles or prepositions as extra words.

Do NOT reject solely for length when the sentence has ${MAX_GERMAN_WORDS} words or fewer.

Output ONLY valid JSON array, no markdown, no commentary:
[
  {
    "id": 0,
    "passed": true | false,
    "corrections": {
      "de": "corrected German if wrong, null if correct",
      "en": "corrected English if wrong, null if correct"
    },
    "issues": ["list of issues found, empty if none"],
    "levelAccurate": true | false
  }
]

Be strict on grammar, spelling, and natural language. If you are even slightly unsure about grammar, mark passed: false. Length alone is not a reason to reject at ${MAX_GERMAN_WORDS} words or below.`;

/** Keep batches small — large batches truncate validation JSON at max_tokens. */
const VALIDATION_BATCH_SIZE = 15;
const VALIDATION_MAX_TOKENS = 8192;

function isLengthOnlyIssue(issue: string): boolean {
  return /word count|words|length|exceeds|limit|too long|8-word|9-word|10-word/i.test(issue);
}

function isLengthOnlyRejection(issues: string[]): boolean {
  return issues.length > 0 && issues.every(isLengthOnlyIssue);
}

export async function validateSentences(
  sentences: SentenceInput[],
  provider: AdminLlmProvider = "claude",
): Promise<ValidateOutput> {
  if (sentences.length === 0) {
    return { passed: [], rejected: [] };
  }

  const passed: SentenceInput[] = [];
  const rejected: ValidateOutput["rejected"] = [];

  for (let offset = 0; offset < sentences.length; offset += VALIDATION_BATCH_SIZE) {
    const batch = sentences.slice(offset, offset + VALIDATION_BATCH_SIZE);
    const batchNum = Math.floor(offset / VALIDATION_BATCH_SIZE) + 1;
    const batchResult = await validateSentenceBatch(batch, `batch ${batchNum}, ${batch.length} items`, provider);
    passed.push(...batchResult.passed);
    rejected.push(...batchResult.rejected);
  }

  return { passed, rejected };
}

async function validateSentenceBatch(
  sentences: SentenceInput[],
  batchLabel: string,
  provider: AdminLlmProvider,
): Promise<ValidateOutput> {
  const passed: SentenceInput[] = [];
  const rejected: ValidateOutput["rejected"] = [];

  try {
    const userPrompt = `Check these ${sentences.length} sentences. Each German sentence must be at most ${MAX_GERMAN_WORDS} words.\n${JSON.stringify(sentences)}`;
    const text = await callAdminLlm(provider, SYSTEM_PROMPT, userPrompt, VALIDATION_MAX_TOKENS);
    const results = parseJsonArray<ValidationResult>(text);

    if (!results) {
      console.error(`[validate] JSON parse failed (${batchLabel}):`, text.slice(0, 500));
      for (const sentence of sentences) {
        rejected.push({ sentence, issues: ["Validation response parse failed"] });
        console.warn("[validate] REJECTED", JSON.stringify({ de: sentence.de, en: sentence.en, issues: ["Validation response parse failed"] }));
      }
      return { passed, rejected };
    }

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const result = results.find(r => r.id === i) ?? results[i];

      if (!result) {
        rejected.push({ sentence, issues: ["No validation result returned"] });
        console.warn("[validate] REJECTED", JSON.stringify({ de: sentence.de, en: sentence.en, issues: ["No validation result returned"] }));
        continue;
      }

      const issues = result.issues ?? [];

      if (!result.passed || !result.levelAccurate) {
        const allIssues = [...issues];
        if (!result.levelAccurate && !allIssues.some(i => /level/i.test(i))) {
          allIssues.push("Level accuracy check failed");
        }

        const correctedDe = result.corrections?.de ?? sentence.de;
        const correctedEn = result.corrections?.en ?? sentence.en;
        if (
          isLengthOnlyRejection(allIssues) &&
          result.levelAccurate !== false &&
          isWithinWordLimit(correctedDe)
        ) {
          passed.push({
            ...sentence,
            de: correctedDe,
            en: correctedEn,
          });
          console.log("[validate] length-only override accepted:", correctedDe);
          continue;
        }

        rejected.push({ sentence, issues: allIssues });
        console.warn("[validate] REJECTED", JSON.stringify({ de: sentence.de, en: sentence.en, issues: allIssues }));
        continue;
      }

      passed.push({
        ...sentence,
        de: result.corrections?.de ?? sentence.de,
        en: result.corrections?.en ?? sentence.en,
      });
    }

    const withinLimit: SentenceInput[] = [];
    for (const sentence of passed) {
      if (isWithinWordLimit(sentence.de)) {
        withinLimit.push(sentence);
        continue;
      }
      const issues = [`Too long: ${countGermanWords(sentence.de)} words (max ${MAX_GERMAN_WORDS})`];
      rejected.push({ sentence, issues });
      console.warn("[validate] REJECTED", JSON.stringify({ de: sentence.de, en: sentence.en, issues }));
    }
    return { passed: withinLimit, rejected };
  } catch (e) {
    console.error(`[validate] ${provider} call failed (${batchLabel}):`, e);
    for (const sentence of sentences) {
      rejected.push({ sentence, issues: ["Validation call failed"] });
      console.warn("[validate] REJECTED", JSON.stringify({ de: sentence.de, en: sentence.en, issues: ["Validation call failed"] }));
    }
  }

  return { passed, rejected };
}
