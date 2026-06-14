"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GRAMMAR_CATEGORIES,
  getBaseTierExercises,
  getCategoryBlock,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { getVerifiedExamplesForBlock } from "@/lib/grammar/verified-examples";

export type TierExerciseCounts = Record<GrammarCategory, { basic: number; advanced: number }>;

interface TierBlock {
  exercises: string[];
  baseCount: number;
  extraCount: number;
}

type CategoryBlocks = Partial<
  Record<GrammarCategory, { basic: TierBlock; advanced: TierBlock }>
>;

function mergeExerciseLists(base: string[], extras: string[]): string[] {
  const seen = new Set(base.map(s => s.trim()));
  const merged = [...base];
  for (const spec of extras) {
    const trimmed = spec.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    merged.push(trimmed);
    seen.add(trimmed);
  }
  return merged;
}

function fallbackBlocks(level: VerifiedLevel): CategoryBlocks {
  const blocks: CategoryBlocks = {};
  for (const cat of GRAMMAR_CATEGORIES) {
    const block = getCategoryBlock(level, cat);
    const imported = getVerifiedExamplesForBlock(level, cat);
    const basicEx = mergeExerciseLists(getBaseTierExercises(block, "basic"), imported);
    const advEx = mergeExerciseLists(getBaseTierExercises(block, "advanced"), imported);
    blocks[cat] = {
      basic: { exercises: basicEx, baseCount: basicEx.length, extraCount: 0 },
      advanced: { exercises: advEx, baseCount: advEx.length, extraCount: 0 },
    };
  }
  return blocks;
}

function emptyCounts(): TierExerciseCounts {
  return {
    derDieDas: { basic: 0, advanced: 0 },
    cases: { basic: 0, advanced: 0 },
    tenses: { basic: 0, advanced: 0 },
    prepositions: { basic: 0, advanced: 0 },
  };
}

export function useGrammarLevelExercises(level: VerifiedLevel) {
  const [blocks, setBlocks] = useState<CategoryBlocks>(() => fallbackBlocks(level));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/grammar/exercises?level=${level}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { blocks?: CategoryBlocks };
      if (data.blocks) setBlocks(data.blocks);
    } catch {
      setBlocks(fallbackBlocks(level));
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    setBlocks(fallbackBlocks(level));
    void refresh();
  }, [level, refresh]);

  const exerciseCounts = useMemo((): TierExerciseCounts => {
    const counts = emptyCounts();
    for (const cat of GRAMMAR_CATEGORIES) {
      counts[cat] = {
        basic: blocks[cat]?.basic.exercises.length ?? getBaseTierExercises(getCategoryBlock(level, cat), "basic").length,
        advanced: blocks[cat]?.advanced.exercises.length ?? getBaseTierExercises(getCategoryBlock(level, cat), "advanced").length,
      };
    }
    return counts;
  }, [blocks, level]);

  const totalExercises = useMemo(
    () =>
      GRAMMAR_CATEGORIES.reduce(
        (sum, cat) => sum + exerciseCounts[cat].basic + exerciseCounts[cat].advanced,
        0,
      ),
    [exerciseCounts],
  );

  return {
    blocks,
    exerciseCounts,
    totalExercises,
    loading,
    refresh,
    getExercises: (category: GrammarCategory, tier: GrammarTier) =>
      blocks[category]?.[tier]?.exercises ??
      getBaseTierExercises(getCategoryBlock(level, category), tier),
  };
}

export function useGrammarExercises(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
) {
  const { getExercises, loading, refresh } = useGrammarLevelExercises(level);
  return {
    exercises: getExercises(category, tier),
    loading,
    refresh,
  };
}
