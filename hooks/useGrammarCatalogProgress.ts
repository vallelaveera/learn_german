"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GrammarCategory, GrammarTier, VerifiedLevel } from "@/lib/grammar/verified-curriculum";
import {
  GRAMMAR_CATEGORIES,
  getBaseTierExercises,
  getCategoryBlock,
  getTierItems,
} from "@/lib/grammar/verified-curriculum";
import type { TierExerciseCounts } from "@/hooks/useGrammarExercises";

const STORAGE_KEY = "grammar_catalog_progress_v2";
const LEGACY_STORAGE_KEY = "grammar_catalog_progress_v1";

export type ItemStatus = "not_started" | "in_progress" | "done";

interface ProgressStore {
  items: Record<string, ItemStatus>;
  exercises: Record<string, boolean>;
  visited: Record<string, boolean>;
}

function itemKey(level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier, index: number): string {
  return `${level}:${category}:${tier}:${index}`;
}

function exerciseKey(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
  index: number,
): string {
  return `${level}:${category}:${tier}:ex:${index}`;
}

function trainerKey(level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier): string {
  return `${level}:${category}:${tier}:trainer`;
}

function countExercisesDone(
  store: ProgressStore,
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): number {
  const prefix = `${level}:${category}:${tier}:ex:`;
  return Object.keys(store.exercises).filter(k => k.startsWith(prefix) && store.exercises[k]).length;
}

function migrateLegacyStore(parsed: Partial<ProgressStore>): ProgressStore {
  const exercises: Record<string, boolean> = { ...(parsed.exercises ?? {}) };
  for (const [key, done] of Object.entries(parsed.exercises ?? {})) {
    const legacy = key.match(/^([^:]+:[^:]+):ex:(\d+)$/);
    if (legacy && !key.includes(":basic:") && !key.includes(":advanced:")) {
      const migrated = `${legacy[1]}:basic:ex:${legacy[2]}`;
      if (!(migrated in exercises)) {
        exercises[migrated] = done;
      }
    }
  }
  return {
    items: parsed.items ?? {},
    exercises,
    visited: parsed.visited ?? {},
  };
}

function loadStore(): ProgressStore {
  if (typeof window === "undefined") {
    return { items: {}, exercises: {}, visited: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return migrateLegacyStore(JSON.parse(raw) as Partial<ProgressStore>);
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      return migrateLegacyStore(JSON.parse(legacy) as Partial<ProgressStore>);
    }
    return { items: {}, exercises: {}, visited: {} };
  } catch {
    return { items: {}, exercises: {}, visited: {} };
  }
}

function saveStore(store: ProgressStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function tierExerciseTotal(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
  exerciseTotals?: TierExerciseCounts,
): number {
  const fromApi = exerciseTotals?.[category]?.[tier];
  if (typeof fromApi === "number") return fromApi;
  return getBaseTierExercises(getCategoryBlock(level, category), tier).length;
}

export function useGrammarCatalogProgress(
  level: VerifiedLevel,
  exerciseTotals?: TierExerciseCounts,
) {
  const [store, setStore] = useState<ProgressStore>(loadStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: ProgressStore) => {
    setStore(next);
    saveStore(next);
  }, []);

  const markTrainerVisited = useCallback(
    (category: GrammarCategory, tier: GrammarTier) => {
      const items = getTierItems(level, category, tier);
      persist({
        ...store,
        visited: { ...store.visited, [trainerKey(level, category, tier)]: true },
        items: {
          ...store.items,
          ...Object.fromEntries(
            items.map((_, i) => [
              itemKey(level, category, tier, i),
              store.items[itemKey(level, category, tier, i)] === "done"
                ? "done"
                : "in_progress",
            ]),
          ),
        },
      });
    },
    [level, store, persist],
  );

  const markExerciseDone = useCallback(
    (category: GrammarCategory, tier: GrammarTier, exIndex: number) => {
      const key = exerciseKey(level, category, tier, exIndex);
      const nextExercises = { ...store.exercises, [key]: true };
      const exerciseTotal = Math.max(tierExerciseTotal(level, category, tier, exerciseTotals), 1);
      const exDone = countExercisesDone(store, level, category, tier);
      const allExercisesDone = exDone >= exerciseTotal;

      const tierItems = getTierItems(level, category, tier);
      const nextItems = { ...store.items };
      if (allExercisesDone) {
        tierItems.forEach((_, i) => {
          nextItems[itemKey(level, category, tier, i)] = "done";
        });
      }

      persist({
        ...store,
        exercises: nextExercises,
        items: nextItems,
        visited: { ...store.visited, [trainerKey(level, category, tier)]: true },
      });
    },
    [level, store, persist, exerciseTotals],
  );

  const itemStatus = useCallback(
    (category: GrammarCategory, tier: GrammarTier, index: number): ItemStatus => {
      return store.items[itemKey(level, category, tier, index)] ?? "not_started";
    },
    [level, store.items],
  );

  const categoryProgress = useCallback(
    (category: GrammarCategory, tier: GrammarTier): { done: number; total: number; pct: number } => {
      const exerciseTotal = Math.max(tierExerciseTotal(level, category, tier, exerciseTotals), 1);
      const exDone = countExercisesDone(store, level, category, tier);
      const pct = Math.min(100, Math.round((exDone / exerciseTotal) * 100));
      return { done: exDone, total: exerciseTotal, pct };
    },
    [level, store, exerciseTotals],
  );

  const levelProgress = useMemo(() => {
    let sumPct = 0;
    let complete = 0;
    for (const cat of GRAMMAR_CATEGORIES) {
      const basic = categoryProgress(cat, "basic");
      const advanced = categoryProgress(cat, "advanced");
      const catPct = Math.round((basic.pct + advanced.pct) / 2);
      sumPct += catPct;
      if (basic.pct >= 100 && advanced.pct >= 100) complete += 1;
    }
    return {
      done: complete,
      total: GRAMMAR_CATEGORIES.length,
      pct: Math.round(sumPct / GRAMMAR_CATEGORIES.length),
    };
  }, [categoryProgress]);

  return {
    hydrated,
    itemStatus,
    categoryProgress,
    levelProgress,
    markTrainerVisited,
    markExerciseDone,
  };
}
