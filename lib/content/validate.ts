import { callClaude, parseJsonArray } from "./generate";
import type { SentenceInput } from "@/lib/vocab/types";

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

Be strict. If you are even slightly unsure, mark passed: false.`;

export async function validateSentences(sentences: SentenceInput[]): Promise<ValidateOutput> {
  if (sentences.length === 0) {
    return { passed: [], rejected: [] };
  }

  const passed: SentenceInput[] = [];
  const rejected: ValidateOutput["rejected"] = [];

  try {
    const userPrompt = `Check these sentences:\n${JSON.stringify(sentences)}`;
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
  } catch (e) {
    console.error("[validate] Claude call failed:", e);
    for (const sentence of sentences) {
      rejected.push({ sentence, issues: ["Validation call failed"] });
      console.warn("[validate] REJECTED", JSON.stringify({ de: sentence.de, en: sentence.en, issues: ["Validation call failed"] }));
    }
  }

  return { passed, rejected };
}
