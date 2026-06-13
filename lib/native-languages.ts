import type { UserProfile } from "./types";
import { isBeginnerLevel } from "./levels";

export { isBeginnerLevel };

export const COMMON_NATIVE_LANGUAGES = [
  "English",
  "Telugu",
  "Türkisch",
  "Arabisch",
  "Hindi",
  "Spanisch",
  "Polnisch",
  "Ukrainisch",
  "Russisch",
  "Französisch",
  "Italienisch",
  "Portugiesisch",
  "Chinesisch",
] as const;

export function isEnglishNative(lang?: string): boolean {
  if (!lang) return false;
  const n = lang.trim().toLowerCase();
  return n === "english" || n === "englisch" || n === "en" || n.startsWith("english ");
}

/** Maya reacts when the learner says Telugu — not from signup/profile alone. */
export function buildTeluguMayaPromptBlock(context: "onboarding" | "call" = "call"): string {
  const after = context === "onboarding"
    ? "Then continue onboarding with ONE short question (job, hobbies, etc.)."
    : "Use at most once per call — then normal conversation.";

  return `
WHEN the learner says Telugu is their mother tongue (they must say it in this conversation — do NOT use profile/signup data alone):
- React warmly once in simple German, e.g.:
  "Oh, schön! Mein Chef Veera hat mich gebaut, damit du Deutsch lernst. Er redet immer über Telugu-Filme. Was ist dein Lieblings-Telugu-Film?"
- Keep it brief, friendly, A1/A2 German. Veera built the app — light personal touch, not a long story.
- ${after}`;
}

export function resolveNativeLanguage(profile: Pick<UserProfile, "nativeLanguage" | "facts">): string | undefined {
  return profile.nativeLanguage?.trim() || profile.facts.nativeLanguage?.trim() || undefined;
}

export function buildHintLanguageBlock(
  level: string | undefined,
  nativeLanguage: string | undefined,
): string {
  if (!isBeginnerLevel(level)) {
    return `HINT LANGUAGE (💡 lines — not spoken):
- Write all 💡 hints in English only.
- Corrections: "💡 Korrektur: «correct German» — one short English note"
- Vocab gloss: "💡 brief English translation" (optional, one line max)`;
  }

  const lang = nativeLanguage?.trim();
  if (!lang || isEnglishNative(lang)) {
    return `HINT LANGUAGE (💡 lines — not spoken):
- Write all 💡 hints in English.
- Corrections: "💡 Korrektur: «correct German» — one short English note"
- Vocab gloss: "💡 «word» = English meaning" (optional, one line max)`;
  }

  return `HINT LANGUAGE (💡 lines — not spoken):
- Learner's native language is ${lang}. Write ALL 💡 hint lines in ${lang} only — NOT English.
- Corrections: "💡 Korrektur: «correct German» — one short note in ${lang}"
- Vocab gloss: "💡 «German word» = ${lang} translation" (optional, one line max)
- Keep each hint to one short line. Spoken German stays German only.`;
}

export function buildBeginnerSpeechBlock(level: string | undefined): string {
  if (!isBeginnerLevel(level)) return "";

  return `
A1/A2 SPEECH (learner is beginner):
- Max ONE short German sentence (~8–10 words) per reply, plus ONE very simple question.
- Use present tense, high-frequency words, no subordinate clauses.
- Prefer yes/no or either/or questions ("Magst du Kaffee oder Tee?").
- Slow, clear, friendly — like talking to someone new to German.`;
}
