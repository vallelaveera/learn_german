export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

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
  if (u.startsWith("B1")) return "B1";
  if (u.startsWith("B2")) return "B2";
  if (u.startsWith("C1")) return "C1";
  if (u.startsWith("C2")) return "C2";
  return "A2";
}

export function levelRank(level?: string): number {
  const map: Record<CEFRLevel, number> = {
    A1: 1,
    A2: 2,
    B1: 3,
    B2: 4,
    C1: 5,
    C2: 6,
  };
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

/** Entry at user's level, one step below, and optionally one step above (not above profile for B2+). */
export function isLevelAppropriate(entryLevel: string | undefined, userLevel?: string): boolean {
  const user = levelRank(userLevel);
  const entry = entryLevelRank(entryLevel);
  if (user <= 1) return entry <= 2;
  const minEntry = Math.max(1, user - 1);
  const maxEntry = user >= 4 ? user : user + 1;
  return entry >= minEntry && entry <= maxEntry;
}
