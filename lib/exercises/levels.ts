export type CEFRLevel = "A1" | "A2" | "B1" | "B2";

const BASIC_PHRASES = new Set([
  "hallo",
  "tschüss",
  "tschuss",
  "danke",
  "bitte",
  "ja",
  "nein",
  "guten morgen",
  "guten abend",
  "auf wiedersehen",
  "wie geht es dir?",
  "ich heiße",
  "wasser",
  "brot",
  "kaffee",
]);

export function normalizeLevel(level?: string): CEFRLevel {
  if (!level) return "A1";
  const u = level.toUpperCase();
  if (u.startsWith("A1")) return "A1";
  if (u.startsWith("A2")) return "A2";
  if (u.startsWith("B2") || u.startsWith("C")) return "B2";
  if (u.startsWith("B1")) return "B1";
  return "A2";
}

export function levelRank(level?: string): number {
  const map: Record<CEFRLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };
  return map[normalizeLevel(level)];
}

export function entryLevelRank(level?: string): number {
  if (!level) return 2;
  return levelRank(level);
}

/** Skip greetings and ultra-basic words for A2+ learners. */
export function isTooBasic(german: string, userLevel?: string): boolean {
  if (levelRank(userLevel) <= 1) return false;
  return BASIC_PHRASES.has(german.toLowerCase().trim());
}

/** Entry is appropriate if at user's level or up to one step above (stretch). */
export function isLevelAppropriate(entryLevel: string | undefined, userLevel?: string): boolean {
  const user = levelRank(userLevel);
  const entry = entryLevelRank(entryLevel);
  if (user <= 1) return entry <= 2;
  return entry >= user - 1 && entry <= user + 1;
}
