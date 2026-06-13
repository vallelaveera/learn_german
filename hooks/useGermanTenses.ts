"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BuildTenseId,
  GermanTensesState,
  TenseAchievements,
  TenseLevel,
  TenseRoundStats,
} from "@/lib/tenses/types";

const STORAGE_KEY = "german_tenses_trainer_v1";

function emptyStats(): TenseRoundStats {
  return { correct: 0, total: 0 };
}

function defaultPerTense(): Record<BuildTenseId, TenseRoundStats> {
  return {
    plusqu: emptyStats(),
    praeter: emptyStats(),
    perf: emptyStats(),
    praes: emptyStats(),
    fut1: emptyStats(),
    fut2: emptyStats(),
  };
}

function defaultPerLevel(): Record<TenseLevel, TenseRoundStats> {
  return { B1: emptyStats(), B2: emptyStats(), C1: emptyStats(), C2: emptyStats() };
}

function defaultAchievements(): TenseAchievements {
  return {
    firstKlammer: false,
    timelineExplorer: false,
    partizipPro: false,
    auxMaster: false,
    b2Unlock: false,
    c1Unlock: false,
  };
}

function defaultState(): GermanTensesState {
  return {
    level: "B1",
    xp: 0,
    streak: 0,
    stats: emptyStats(),
    perTense: defaultPerTense(),
    perLevel: defaultPerLevel(),
    learned: [],
    achievements: defaultAchievements(),
    klammerPerfects: 0,
    partizipHits: 0,
    auxHits: 0,
    timelineViews: 0,
  };
}

function loadState(): GermanTensesState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<GermanTensesState>;
    return {
      ...defaultState(),
      ...parsed,
      perTense: { ...defaultPerTense(), ...parsed.perTense },
      perLevel: { ...defaultPerLevel(), ...parsed.perLevel },
      achievements: { ...defaultAchievements(), ...parsed.achievements },
      learned: parsed.learned ?? [],
    };
  } catch {
    return defaultState();
  }
}

function persistState(state: GermanTensesState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncAchievements(state: GermanTensesState): TenseAchievements {
  return {
    firstKlammer: state.achievements.firstKlammer || state.klammerPerfects >= 1,
    timelineExplorer: state.timelineViews >= 6,
    partizipPro: state.partizipHits >= 6,
    auxMaster: state.auxHits >= 10,
    b2Unlock: state.level === "B2" || state.level === "C1" || state.level === "C2",
    c1Unlock: state.level === "C1" || state.level === "C2",
  };
}

export function useGermanTenses() {
  const [state, setState] = useState<GermanTensesState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistState(state);
  }, [state, hydrated]);

  const setLevel = useCallback((level: TenseLevel) => {
    setState(prev => {
      const next = { ...prev, level };
      next.achievements = syncAchievements(next);
      return next;
    });
  }, []);

  const addXp = useCallback((amount: number) => {
    setState(prev => ({ ...prev, xp: prev.xp + amount }));
  }, []);

  const recordAnswer = useCallback(
    (tenseId: BuildTenseId, level: TenseLevel, correct: boolean, extras?: { klammerPerfect?: boolean }) => {
      setState(prev => {
        const perTense = { ...prev.perTense, [tenseId]: { ...prev.perTense[tenseId] } };
        perTense[tenseId].total += 1;
        if (correct) perTense[tenseId].correct += 1;

        const perLevel = { ...prev.perLevel, [level]: { ...prev.perLevel[level] } };
        perLevel[level].total += 1;
        if (correct) perLevel[level].correct += 1;

        const stats = { ...prev.stats };
        stats.total += 1;
        if (correct) stats.correct += 1;

        const next: GermanTensesState = {
          ...prev,
          stats,
          perTense,
          perLevel,
          streak: correct ? prev.streak + 1 : 0,
          klammerPerfects: prev.klammerPerfects + (extras?.klammerPerfect ? 1 : 0),
          achievements: { ...prev.achievements },
        };

        if (extras?.klammerPerfect) {
          next.achievements.firstKlammer = true;
        }

        next.achievements = syncAchievements(next);
        return next;
      });
    },
    [],
  );

  const recordLearned = useCallback((wordId: string) => {
    setState(prev =>
      prev.learned.includes(wordId) ? prev : { ...prev, learned: [...prev.learned, wordId] },
    );
  }, []);

  const recordPartizipHit = useCallback(() => {
    setState(prev => {
      const next = { ...prev, partizipHits: prev.partizipHits + 1 };
      next.achievements = syncAchievements(next);
      return next;
    });
  }, []);

  const recordAuxHit = useCallback(() => {
    setState(prev => {
      const next = { ...prev, auxHits: prev.auxHits + 1 };
      next.achievements = syncAchievements(next);
      return next;
    });
  }, []);

  const recordTimelineView = useCallback(() => {
    setState(prev => {
      const next = { ...prev, timelineViews: prev.timelineViews + 1 };
      next.achievements = syncAchievements(next);
      return next;
    });
  }, []);

  const accuracy = useMemo(() => {
    if (state.stats.total === 0) return 0;
    return Math.round((state.stats.correct / state.stats.total) * 100);
  }, [state.stats]);

  const levelMastery = useCallback(
    (level: TenseLevel) => {
      const s = state.perLevel[level];
      if (s.total === 0) return 0;
      return Math.round((s.correct / s.total) * 100);
    },
    [state.perLevel],
  );

  const tenseMastery = useCallback(
    (tenseId: BuildTenseId) => {
      const s = state.perTense[tenseId];
      if (s.total === 0) return 0;
      return Math.round((s.correct / s.total) * 100);
    },
    [state.perTense],
  );

  return {
    ...state,
    hydrated,
    accuracy,
    setLevel,
    addXp,
    recordAnswer,
    recordLearned,
    recordPartizipHit,
    recordAuxHit,
    recordTimelineView,
    levelMastery,
    tenseMastery,
  };
}

export type UseGermanTensesReturn = ReturnType<typeof useGermanTenses>;
