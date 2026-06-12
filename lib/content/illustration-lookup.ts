import { BATCH_SENTENCES } from "./sentences-batch";
import type { SentenceExerciseCategory } from "@/lib/exercises/categories";

/** Max Claude generations per API request (avoids Vercel timeouts). */
export const ILLUSTRATION_BATCH_LIMIT = 10;

export function normalizeGerman(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

const GERMAN_TO_ILLUSTRATION_ID = new Map(
  BATCH_SENTENCES.map(s => [normalizeGerman(s.de), s.id]),
);

/** Prefer batch illustration id when German text matches a generated scene. */
export function resolveIllustrationId(id: string, german: string): string {
  return GERMAN_TO_ILLUSTRATION_ID.get(normalizeGerman(german)) ?? id;
}

export function batchCategoryMatchesExercise(
  batchCategory: string,
  exercise: SentenceExerciseCategory,
): boolean {
  if (exercise === "call") return false;
  if (exercise === "travel") return batchCategory === "transport";
  if (exercise === "work") return batchCategory === "career";
  if (exercise === "everyday") {
    return batchCategory === "food" || batchCategory === "daily_life" || batchCategory === "emotions";
  }
  return false;
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  transport: ["transport", "travel", "reise", "verkehr"],
  food: ["food", "food_drink", "essen", "drink"],
  daily_life: ["daily_life", "alltag", "everyday", "home"],
  career: ["career", "work", "beruf", "job"],
  emotions: ["emotions", "feelings", "gefuehle", "emotion"],
};

export function corpusCategoryMatchesBatch(corpusCategory: string, batchCategory: string): boolean {
  const normalized = corpusCategory.toLowerCase().trim();
  const aliases = CATEGORY_ALIASES[batchCategory] ?? [batchCategory];
  return aliases.some(a => normalized === a || normalized.includes(a));
}

export function inferBatchCategoryFromGerman(german: string): string | null {
  const lower = german.toLowerCase();
  if (/(zug|bus|bahn|flug|ticket|fahr|reise|hotel|flughafen)/.test(lower)) return "transport";
  if (/(kaffee|esse|trink|koch|restaurant|brot|kuchen|suppe|hunger)/.test(lower)) return "food";
  if (/(arbeit|stelle|meeting|büro|chef|projekt|bewerb|bericht)/.test(lower)) return "career";
  if (/(freue|müde|stolz|dankbar|ärger|lacht|aufgeregt|gefühl|heimweh)/.test(lower)) return "emotions";
  return "daily_life";
}
