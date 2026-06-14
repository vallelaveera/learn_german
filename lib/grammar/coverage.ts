import {
  CATEGORY_LABELS,
  GRAMMAR_CATEGORIES,
  VERIFIED_CURRICULUM,
  VERIFIED_LEVELS,
  getBaseTierExercises,
  getCategoryBlock,
  type CoverageStatus,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "./verified-curriculum";

/** Minimum practice sessions per level × category × tier before we flag a gap. */
export const GRAMMAR_EXERCISE_TARGET = 8;

export const GRAMMAR_TIERS: GrammarTier[] = ["basic", "advanced"];

export const TIER_LABELS: Record<GrammarTier, string> = {
  basic: "Basic",
  advanced: "Advanced",
};

export interface GrammarBlockCoverage {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  label: string;
  tierLabel: string;
  theoryCount: number;
  exerciseCount: number;
  extraExerciseCount: number;
  totalExerciseCount: number;
  status: CoverageStatus;
  trainerId?: string;
  curriculumIds?: string[];
  needsExercises: number;
  gap: boolean;
}

export interface GrammarCoverageReport {
  meta: { version: number; title: string; generatedAt?: string };
  totals: {
    slots: number;
    exercises: number;
    extraExercises: number;
    theoryPoints: number;
    gaps: number;
  };
  blocks: GrammarBlockCoverage[];
  gaps: GrammarBlockCoverage[];
}

export function blockKey(level: VerifiedLevel, category: GrammarCategory): string {
  return `${level}:${category}`;
}

export function tierBlockKey(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): string {
  return `${level}:${category}:${tier}`;
}

export function buildGrammarCoverageReport(
  extraCounts: Record<string, number> = {},
): GrammarCoverageReport {
  const blocks: GrammarBlockCoverage[] = [];
  let totalExercises = 0;
  let totalExtra = 0;
  let totalTheory = 0;
  let gapCount = 0;

  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      const block = getCategoryBlock(level, category);
      for (const tier of GRAMMAR_TIERS) {
        const key = tierBlockKey(level, category, tier);
        const legacyKey = blockKey(level, category);
        const extraExerciseCount =
          extraCounts[key] ?? (tier === "basic" ? extraCounts[legacyKey] ?? 0 : 0);
        const exerciseCount = getBaseTierExercises(block, tier).length;
        const totalExerciseCount = exerciseCount + extraExerciseCount;
        const needsExercises = Math.max(0, GRAMMAR_EXERCISE_TARGET - totalExerciseCount);
        const gap = needsExercises > 0 || block.appCoverage.status === "MISSING";
        if (gap) gapCount += 1;

        totalExercises += exerciseCount;
        totalExtra += extraExerciseCount;
        if (tier === "basic") {
          totalTheory += block.basic.length;
        } else {
          totalTheory += block.advanced.length;
        }

        blocks.push({
          level,
          category,
          tier,
          label: CATEGORY_LABELS[category],
          tierLabel: TIER_LABELS[tier],
          theoryCount: tier === "basic" ? block.basic.length : block.advanced.length,
          exerciseCount,
          extraExerciseCount,
          totalExerciseCount,
          status: block.appCoverage.status,
          trainerId: block.appCoverage.trainerId,
          curriculumIds: block.appCoverage.curriculumIds,
          needsExercises,
          gap,
        });
      }
    }
  }

  return {
    meta: VERIFIED_CURRICULUM.meta,
    totals: {
      slots: blocks.length,
      exercises: totalExercises,
      extraExercises: totalExtra,
      theoryPoints: totalTheory,
      gaps: gapCount,
    },
    blocks,
    gaps: blocks.filter(b => b.gap),
  };
}
