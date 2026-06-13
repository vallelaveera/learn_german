export type TenseLevel = "B1" | "B2" | "C1" | "C2";
export type TenseTab = "build" | "patterns" | "workshop" | "progress";
export type BuildTenseId = "plusqu" | "praeter" | "perf" | "praes" | "fut1" | "fut2";

export type SubjectId = "ich" | "du" | "er" | "sie3" | "es" | "wir" | "ihr" | "siePl" | "Sie";
export type TenseId =
  | "plusqu"
  | "praeter"
  | "perf"
  | "praes"
  | "fut1"
  | "fut2"
  | "konj2"
  | "passiv"
  | "konj1"
  | "doubleInf";

export type TokenState = "past" | "present" | "future" | "futdone";
export type PartizipType = "weak" | "strong" | "mixed" | "separable" | "inseparable" | "ieren";
export type BuildMode = "sandbox" | "challenge";

export interface TenseRoundStats {
  correct: number;
  total: number;
}

export interface TenseAchievements {
  firstKlammer: boolean;
  timelineExplorer: boolean;
  partizipPro: boolean;
  auxMaster: boolean;
  b2Unlock: boolean;
  c1Unlock: boolean;
}

export interface GermanTensesState {
  level: TenseLevel;
  xp: number;
  streak: number;
  stats: TenseRoundStats;
  perTense: Record<BuildTenseId, TenseRoundStats>;
  perLevel: Record<TenseLevel, TenseRoundStats>;
  learned: string[];
  achievements: TenseAchievements;
  klammerPerfects: number;
  partizipHits: number;
  auxHits: number;
  timelineViews: number;
}

export const TENSE_LEVELS: TenseLevel[] = ["B1", "B2", "C1", "C2"];
export const TENSE_TABS: TenseTab[] = ["build", "patterns", "workshop", "progress"];

export function levelIncludes(selected: TenseLevel, itemLevel: TenseLevel): boolean {
  const order: TenseLevel[] = ["B1", "B2", "C1", "C2"];
  return order.indexOf(itemLevel) <= order.indexOf(selected);
}
