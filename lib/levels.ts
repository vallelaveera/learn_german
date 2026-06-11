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

export function shouldSkipLevelOnLogin(user: {
  totalSessions?: number;
  facts?: { placementDone?: boolean };
}): boolean {
  return (user.totalSessions ?? 0) > 0 || !!user.facts?.placementDone;
}
