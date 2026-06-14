"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GrammarCategory, GrammarTier, VerifiedLevel } from "@/lib/grammar/verified-curriculum";
import { GRAMMAR_CATEGORIES, getTierItems } from "@/lib/grammar/verified-curriculum";

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

export function useGrammarCatalogProgress(level: VerifiedLevel, tier: GrammarTier) {
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
    (category: GrammarCategory) => {
      persist({
        ...store,
        visited: { ...store.visited, [trainerKey(level, category)]: true },
        items: {
          ...store.items,
          ...Object.fromEntries(
            getTierItems(level, category, tier).map((_, i) => [
              itemKey(level, category, tier, i),
              store.items[itemKey(level, category, tier, i)] === "done"
                ? "done"
                : "in_progress",
            ]),
          ),
        },
      });
    },
    [level, tier, store, persist],
  );

  const markExerciseDone = useCallback(
    (category: GrammarCategory, exIndex: number) => {
      const key = exerciseKey(level, category, exIndex);
      persist({
        ...store,
        exercises: { ...store.exercises, [key]: true },
        visited: { ...store.visited, [trainerKey(level, category)]: true },
      });
    },
    [level, store, persist],
  );

  const itemStatus = useCallback(
    (category: GrammarCategory, index: number): ItemStatus => {
      return store.items[itemKey(level, category, tier, index)] ?? "not_started";
    },
    [level, tier, store.items],
  );

  const categoryProgress = useCallback(
    (category: GrammarCategory): { done: number; total: number; pct: number } => {
      const items = getTierItems(level, category, tier);
      const exKeyPrefix = `${level}:${category}:ex:`;
      const exDone = Object.keys(store.exercises).filter(
        k => k.startsWith(exKeyPrefix) && store.exercises[k],
      ).length;
      const itemDone = items.filter((_, i) => itemStatus(category, i) === "done").length;
      const visited = store.visited[trainerKey(level, category)] ? 1 : 0;
      const done = Math.max(itemDone, visited, exDone > 0 ? 1 : 0);
      const total = Math.max(items.length, 1);
      return { done: Math.min(done, total), total, pct: Math.round((Math.min(done, total) / total) * 100) };
    },
    [level, tier, store, itemStatus],
  );

  const levelProgress = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const cat of GRAMMAR_CATEGORIES) {
      const items = getTierItems(level, cat, tier);
      total += items.length || 1;
      const cp = categoryProgress(cat);
      done += cp.done;
    }
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [level, tier, categoryProgress]);

  return {
    hydrated,
    itemStatus,
    categoryProgress,
    levelProgress,
    markTrainerVisited,
    markExerciseDone,
  };
}
