export const GERMAN_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type GermanLevel = (typeof GERMAN_LEVELS)[number];

export const LEVEL_DESCRIPTIONS: Record<GermanLevel, string> = {
  A1: "Absolute Beginner",
  A2: "Grundkenntnisse",
  B1: "Mittelstufe",
  B2: "Obere Mittelstufe",
  C1: "Fortgeschritten",
  C2: "Annähernd muttersprachlich",
};

export function nextGermanLevel(level: string): GermanLevel | null {
  const idx = GERMAN_LEVELS.indexOf(level as GermanLevel);
  if (idx < 0 || idx >= GERMAN_LEVELS.length - 1) return null;
  return GERMAN_LEVELS[idx + 1];
}

export function isBeginnerLevel(level?: string): boolean {
  return level === "A1" || level === "A2";
}

export function shouldSkipLevelOnLogin(user: {
  totalSessions?: number;
  createdAt?: number;
  facts?: { placementDone?: boolean; levelOnboarded?: boolean };
}): boolean {
  if (user.facts?.levelOnboarded) return true;
  if ((user.totalSessions ?? 0) > 0) return true;
  if (user.facts?.placementDone) return true;
  // Legacy accounts that already used the app before level onboarding existed
  if (user.createdAt && Date.now() - user.createdAt > 24 * 60 * 60 * 1000) return true;
  return false;
}
