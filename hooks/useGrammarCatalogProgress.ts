"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GrammarCategory, GrammarTier, VerifiedLevel } from "@/lib/grammar/verified-curriculum";
import {
  GRAMMAR_CATEGORIES,
  getCategoryBlock,
  getTierItems,
} from "@/lib/grammar/verified-curriculum";

const STORAGE_KEY = "grammar_catalog_progress_v1";

export type ItemStatus = "not_started" | "in_progress" | "done";

interface ProgressStore {
  items: Record<string, ItemStatus>;
  exercises: Record<string, boolean>;
  visited: Record<string, boolean>;
}

function itemKey(level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier, index: number): string {
  return `${level}:${category}:${tier}:${index}`;
}

function exerciseKey(level: VerifiedLevel, category: GrammarCategory, index: number): string {
  return `${level}:${category}:ex:${index}`;
}

function trainerKey(level: VerifiedLevel, category: GrammarCategory): string {
  return `${level}:${category}:trainer`;
}

function countExercisesDone(
  store: ProgressStore,
  level: VerifiedLevel,
  category: GrammarCategory,
): number {
  const prefix = `${level}:${category}:ex:`;
  return Object.keys(store.exercises).filter(k => k.startsWith(prefix) && store.exercises[k]).length;
}

function loadStore(): ProgressStore {
  if (typeof window === "undefined") {
    return { items: {}, exercises: {}, visited: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: {}, exercises: {}, visited: {} };
    const parsed = JSON.parse(raw) as Partial<ProgressStore>;
    return {
      items: parsed.items ?? {},
      exercises: parsed.exercises ?? {},
      visited: parsed.visited ?? {},
    };
  } catch {
    return { items: {}, exercises: {}, visited: {} };
  }
}

function saveStore(store: ProgressStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useGrammarCatalogProgress(level: VerifiedLevel) {
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
        visited: { ...store.visited, [trainerKey(level, category)]: true },
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
      const block = getCategoryBlock(level, category);
      const key = exerciseKey(level, category, exIndex);
      const nextExercises = { ...store.exercises, [key]: true };
      const exDone = Object.keys(nextExercises).filter(
        k => k.startsWith(`${level}:${category}:ex:`) && nextExercises[k],
      ).length;
      const allExercisesDone = block.exercises.length > 0 && exDone >= block.exercises.length;

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
        visited: { ...store.visited, [trainerKey(level, category)]: true },
      });
    },
    [level, store, persist],
  );

  const itemStatus = useCallback(
    (category: GrammarCategory, tier: GrammarTier, index: number): ItemStatus => {
      return store.items[itemKey(level, category, tier, index)] ?? "not_started";
    },
    [level, store.items],
  );

  const categoryProgress = useCallback(
    (category: GrammarCategory, tier: GrammarTier): { done: number; total: number; pct: number } => {
      const block = getCategoryBlock(level, category);
      const exerciseTotal = Math.max(block.exercises.length, 1);
      const exDone = countExercisesDone(store, level, category);
      const pct = Math.min(100, Math.round((exDone / exerciseTotal) * 100));
      return { done: exDone, total: exerciseTotal, pct };
    },
    [level, store],
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
