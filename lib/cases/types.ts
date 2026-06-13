export type CaseLevel = "B1" | "B2" | "C1" | "C2";
export type CaseTab = "build" | "patterns" | "portals" | "progress";
export type CaseKey = "nom" | "akk" | "dat" | "gen" | "wechsel";
export type CaseGender = "m" | "f" | "n";
export type VerbRole = "nom" | "dat" | "akk";
export type GovCase = "akk" | "dat" | "gen";

export interface CaseNoun {
  id: string;
  word: string;
  gender: CaseGender;
  plural: string;
  en: string;
  emoji: string;
  level: CaseLevel;
  genitiveSg: string;
  dativePl: string;
  nDecl?: boolean;
  adjNoun?: boolean;
}

export interface CaseVerb {
  id: string;
  infinitive: string;
  conj3sg: string;
  en: string;
  enPattern: string;
  frame: VerbRole[];
  rule: string;
  level: CaseLevel;
  prep?: { word: string; case: GovCase };
}

export interface CaseSentence {
  id: string;
  caseKey: CaseKey;
  level: CaseLevel;
  pre: string;
  highlight: string;
  post: string;
  en: string;
}

export interface PortalSet {
  id: string;
  label: string;
  acronym?: string;
  caseKey: CaseKey | "wechsel";
  prepositions: string[];
  level: CaseLevel;
  hint: string;
}

export interface CaseRoundStats {
  correct: number;
  total: number;
}

export interface CaseAchievements {
  firstPerfectBuild: boolean;
  dativeDetective: boolean;
  portalMaster: boolean;
  nDeclUnlocked: boolean;
  genitivNoble: boolean;
  shapeshifter: boolean;
}

export interface GermanCasesState {
  level: CaseLevel;
  xp: number;
  streak: number;
  stats: CaseRoundStats;
  perCase: Record<CaseKey, CaseRoundStats>;
  perLevel: Record<CaseLevel, CaseRoundStats>;
  learned: string[];
  achievements: CaseAchievements;
  dativeVerbHits: number;
  portalPerfects: number;
  wechselHits: number;
  genitiveHits: number;
  nDeclHits: number;
}

export const CASE_LEVELS: CaseLevel[] = ["B1", "B2", "C1", "C2"];
export const CASE_TABS: CaseTab[] = ["build", "patterns", "portals", "progress"];

export function levelIncludes(selected: CaseLevel, itemLevel: CaseLevel): boolean {
  const order: CaseLevel[] = ["B1", "B2", "C1", "C2"];
  return order.indexOf(itemLevel) <= order.indexOf(selected);
}
