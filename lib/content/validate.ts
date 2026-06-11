import { callClaude, parseJsonArray } from "./generate";
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

const SYSTEM_PROMPT = `You are a strict German grammar and spelling checker.
You are checking sentences for a language learning app.
Every sentence must be perfect — no errors allowed.

For each sentence check:
1. German spelling — every word correctly spelled
2. Grammar — correct case, gender, verb conjugation, 
   word order
3. Natural language — would a native speaker say this?
4. Level accuracy — does vocabulary and grammar 
   actually match the stated CEFR level?
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

function isLengthOnlyIssue(issue: string): boolean {
  return /word count|words|length|exceeds|limit|too long|8-word|9-word|10-word/i.test(issue);
}

function isLengthOnlyRejection(issues: string[]): boolean {
  return issues.length > 0 && issues.every(isLengthOnlyIssue);
}

export async function validateSentences(sentences: SentenceInput[]): Promise<ValidateOutput> {
  if (sentences.length === 0) {
    return { passed: [], rejected: [] };
  }

  const passed: SentenceInput[] = [];
  const rejected: ValidateOutput["rejected"] = [];

  try {
    const userPrompt = `Check these sentences. Each German sentence must be at most ${MAX_GERMAN_WORDS} words.\n${JSON.stringify(sentences)}`;
    const text = await callClaude(SYSTEM_PROMPT, userPrompt);
    const results = parseJsonArray<ValidationResult>(text);

    if (!results) {
      console.error("[validate] JSON parse failed:", text.slice(0, 500));
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

    // Hard word-count guard after corrections
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
    console.error("[validate] Claude call failed:", e);
    for (const sentence of sentences) {
      rejected.push({ sentence, issues: ["Validation call failed"] });
      console.warn("[validate] REJECTED", JSON.stringify({ de: sentence.de, en: sentence.en, issues: ["Validation call failed"] }));
    }
  }

  return { passed, rejected };
}
