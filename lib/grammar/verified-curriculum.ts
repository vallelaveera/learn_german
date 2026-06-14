import verifiedData from "../../public/data/german_grammar_curriculum_verified.json";

export type VerifiedLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type GrammarCategory = "derDieDas" | "cases" | "tenses" | "prepositions";
export type GrammarTier = "basic" | "advanced";
export type CoverageStatus = "EXISTS" | "PARTIAL" | "MISSING";

export const VERIFIED_LEVELS: VerifiedLevel[] = ["A1", "A2", "B1", "B2", "C1"];
export const GRAMMAR_CATEGORIES: GrammarCategory[] = ["derDieDas", "cases", "tenses", "prepositions"];

export const CATEGORY_LABELS: Record<GrammarCategory, string> = {
  derDieDas: "Der · Die · Das",
  cases: "Fälle",
  tenses: "Zeiten",
  prepositions: "Präpositionen",
};

export const CATEGORY_EMOJI: Record<GrammarCategory, string> = {
  derDieDas: "👑",
  cases: "📐",
  tenses: "⏳",
  prepositions: "📍",
};

export interface AppCoverage {
  status: CoverageStatus;
  trainerId?: string;
  curriculumIds?: string[];
  notes?: string;
}

export interface CategoryBlock {
  basic: string[];
  advanced: string[];
  typicalMistakes: string[];
  /** Legacy shared pool — treated as Basic when exercisesBasic is absent */
  exercises: string[];
  exercisesBasic?: string[];
  exercisesAdvanced?: string[];
  appCoverage: AppCoverage;
}

export type LevelCatalog = Record<GrammarCategory, CategoryBlock>;

export interface VerifiedCurriculum {
  meta: {
    version: number;
    title: string;
    description: string;
    generatedAt?: string;
  };
  A1: LevelCatalog;
  A2: LevelCatalog;
  B1: LevelCatalog;
  B2: LevelCatalog;
  C1: LevelCatalog;
}

export const VERIFIED_CURRICULUM = verifiedData as VerifiedCurriculum;

export function getLevelCatalog(level: VerifiedLevel): LevelCatalog {
  return VERIFIED_CURRICULUM[level];
}

export function getCategoryBlock(level: VerifiedLevel, category: GrammarCategory): CategoryBlock {
  return VERIFIED_CURRICULUM[level][category];
}

export function getTierItems(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): string[] {
  const block = getCategoryBlock(level, category);
  return tier === "basic" ? block.basic : block.advanced;
}

/** Base exercise specs from verified JSON for one tier (before KV enrichment). */
export function getBaseTierExercises(block: CategoryBlock, tier: GrammarTier): string[] {
  if (tier === "basic") {
    return block.exercisesBasic ?? block.exercises ?? [];
  }
  return block.exercisesAdvanced ?? [];
}

export function getTierExerciseCount(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): number {
  return getBaseTierExercises(getCategoryBlock(level, category), tier).length;
}

export function countCatalogItems(level: VerifiedLevel, tier?: GrammarTier): number {
  let total = 0;
  for (const cat of GRAMMAR_CATEGORIES) {
    const block = getCategoryBlock(level, cat);
    if (!tier || tier === "basic") total += block.basic.length;
    if (!tier || tier === "advanced") total += block.advanced.length;
  }
  return total;
}

export function levelColor(level: VerifiedLevel): string {
  const colors: Record<VerifiedLevel, string> = {
    A1: "#1D9E75",
    A2: "#3B82F6",
    B1: "#6B4FA0",
    B2: "#085041",
    C1: "#9A3412",
  };
  return colors[level];
}

export function levelLightColor(level: VerifiedLevel): string {
  const colors: Record<VerifiedLevel, string> = {
    A1: "#EAF3DE",
    A2: "#EFF6FF",
    B1: "#F3EEFC",
    B2: "#E6F4F1",
    C1: "#FFF7ED",
  };
  return colors[level];
}
