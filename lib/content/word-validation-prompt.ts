import { MAX_VOCAB_WORDS } from "./vocab-word-count";

export interface WordValidationResult {
  id?: number;
  de?: string;
  passed: boolean;
  corrections: {
    de: string | null;
    en: string | null;
    distractors: string[] | null;
  };
  issues: string[];
  levelAccurate: boolean;
}

export const WORD_VALIDATION_SYSTEM_PROMPT = `You are a strict German vocabulary checker for a language learning flashcard app.
Every entry must be perfect — no errors allowed.

Reject invented or atypical vocabulary:
- Reject rare, archaic, or niche words not found on standard CEFR word lists
- Reject dialect, slang, brand names, or full sentences disguised as vocabulary
- Reject if article gender looks guessed or wrong for a common noun

For each entry check:
1. German spelling and grammar (correct article der/die/das, gender, plural if shown)
2. Natural vocabulary — would a native speaker use this word/phrase?
3. Level accuracy — does it match the stated CEFR level?
4. English translation accuracy
5. Distractors — exactly 2, plausible but wrong, not duplicates of the correct answer
6. Distractors must use the same English style as the correct answer (all with "the" or all without)
7. Length — German entry must be at most ${MAX_VOCAB_WORDS} words; reject full sentences

Output ONLY valid JSON array, no markdown, no commentary.
Each object MUST include "de" copied exactly from the input entry you checked.
Use "id" matching the index in the input list (0, 1, 2, …).
[
  {
    "id": 0,
    "de": "der Mieter",
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

Be strict. If you are even slightly unsure, mark passed: false.
Only report issues for the specific "de" entry you are checking — never mix up neighboring entries.`;

export function issuesReferenceOtherGerman(issues: string[], wordDe: string): boolean {
  const wordNorm = wordDe.toLowerCase().trim();
  const stem = wordNorm.replace(/^(der|die|das|ein|eine)\s+/i, "");
  const issueText = issues.join(" ");

  const quoted = issueText.match(/['"«][^'"»]+['"»]/g) ?? [];
  for (const q of quoted) {
    const inner = q.replace(/['"«»]/g, "").trim().toLowerCase();
    if (inner.length < 4) continue;
    if (wordNorm.includes(inner) || inner.includes(stem)) continue;
    if (/^(der|die|das)\s+\S+/i.test(inner)) return true;
  }

  return false;
}

export function validationResultMatchesWord(
  result: WordValidationResult | undefined,
  wordDe: string,
  index: number,
): boolean {
  if (!result) return false;
  const expected = wordDe.toLowerCase().trim();
  const resultDe = result.de?.toLowerCase().trim();
  if (resultDe && resultDe !== expected) return false;
  if (result.id !== undefined && result.id !== index && !resultDe) return false;
  if (result.issues?.length && issuesReferenceOtherGerman(result.issues, wordDe)) return false;
  return true;
}
