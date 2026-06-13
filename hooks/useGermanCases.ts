"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CaseAchievements,
  CaseKey,
  CaseLevel,
  CaseRoundStats,
  GermanCasesState,
} from "@/lib/cases/types";

const STORAGE_KEY = "german_cases_trainer_v1";

function emptyStats(): CaseRoundStats {
  return { correct: 0, total: 0 };
}

function defaultPerCase(): Record<CaseKey, CaseRoundStats> {
  return {
    nom: emptyStats(),
    akk: emptyStats(),
    dat: emptyStats(),
    gen: emptyStats(),
    wechsel: emptyStats(),
  };
}

function defaultPerLevel(): Record<CaseLevel, CaseRoundStats> {
  return { B1: emptyStats(), B2: emptyStats(), C1: emptyStats(), C2: emptyStats() };
}

function defaultAchievements(): CaseAchievements {
  return {
    firstPerfectBuild: false,
    dativeDetective: false,
    portalMaster: false,
    nDeclUnlocked: false,
    genitivNoble: false,
    shapeshifter: false,
  };
}

function defaultState(): GermanCasesState {
  return {
    level: "B1",
    xp: 0,
    streak: 0,
    stats: emptyStats(),
    perCase: defaultPerCase(),
    perLevel: defaultPerLevel(),
    learned: [],
    achievements: defaultAchievements(),
    dativeVerbHits: 0,
    portalPerfects: 0,
    wechselHits: 0,
    genitiveHits: 0,
    nDeclHits: 0,
  };
}

function loadState(): GermanCasesState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<GermanCasesState>;
    return {
      ...defaultState(),
      ...parsed,
      perCase: { ...defaultPerCase(), ...parsed.perCase },
      perLevel: { ...defaultPerLevel(), ...parsed.perLevel },
      achievements: { ...defaultAchievements(), ...parsed.achievements },
      learned: parsed.learned ?? [],
    };
  } catch {
    return defaultState();
  }
}

function persistState(state: GermanCasesState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncAchievements(state: GermanCasesState): CaseAchievements {
  return {
    firstPerfectBuild: state.achievements.firstPerfectBuild,
    dativeDetective: state.dativeVerbHits >= 20,
    portalMaster: state.portalPerfects >= 1,
    nDeclUnlocked: state.nDeclHits >= 1,
    genitivNoble: state.genitiveHits >= 10,
    shapeshifter: state.wechselHits >= 10,
  };
}

export function useGermanCases() {
  const [state, setState] = useState<GermanCasesState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistState(state);
  }, [state, hydrated]);

  const setLevel = useCallback((level: CaseLevel) => {
    setState(prev => ({ ...prev, level }));
  }, []);

  const addXp = useCallback((amount: number) => {
    setState(prev => ({ ...prev, xp: prev.xp + amount }));
  }, []);

  const recordAnswer = useCallback(
    (
      caseKey: CaseKey,
      level: CaseLevel,
      correct: boolean,
      extras?: { dativeVerb?: boolean; nDecl?: boolean; genitive?: boolean; wechsel?: boolean; perfectBuild?: boolean },
    ) => {
      setState(prev => {
        const perCase = { ...prev.perCase, [caseKey]: { ...prev.perCase[caseKey] } };
        perCase[caseKey].total += 1;
        if (correct) perCase[caseKey].correct += 1;

        const perLevel = { ...prev.perLevel, [level]: { ...prev.perLevel[level] } };
        perLevel[level].total += 1;
        if (correct) perLevel[level].correct += 1;

        const stats = { ...prev.stats };
        stats.total += 1;
        if (correct) stats.correct += 1;

        const next: GermanCasesState = {
          ...prev,
          stats,
          perCase,
          perLevel,
          streak: correct ? prev.streak + 1 : 0,
          dativeVerbHits: prev.dativeVerbHits + (extras?.dativeVerb && correct ? 1 : 0),
          nDeclHits: prev.nDeclHits + (extras?.nDecl && correct ? 1 : 0),
          genitiveHits: prev.genitiveHits + (extras?.genitive && correct ? 1 : 0),
          wechselHits: prev.wechselHits + (extras?.wechsel && correct ? 1 : 0),
          portalPerfects: prev.portalPerfects,
          achievements: { ...prev.achievements },
        };

        if (extras?.perfectBuild) {
          next.achievements.firstPerfectBuild = true;
        }

        next.achievements = syncAchievements(next);
        return next;
      });
    },
    [],
  );

  const recordLearned = useCallback((wordId: string) => {
    setState(prev =>
      prev.learned.includes(wordId)
        ? prev
        : { ...prev, learned: [...prev.learned, wordId] },
    );
  }, []);

  const recordPortalPerfect = useCallback(() => {
    setState(prev => {
      const next = { ...prev, portalPerfects: prev.portalPerfects + 1 };
      next.achievements = syncAchievements(next);
      return next;
    });
  }, []);

  const accuracy = useMemo(() => {
    if (state.stats.total === 0) return 0;
    return Math.round((state.stats.correct / state.stats.total) * 100);
  }, [state.stats]);

  const levelMastery = useCallback(
    (level: CaseLevel) => {
      const s = state.perLevel[level];
      if (s.total === 0) return 0;
      return Math.round((s.correct / s.total) * 100);
    },
    [state.perLevel],
  );

  return {
    ...state,
    hydrated,
    accuracy,
    setLevel,
    addXp,
    recordAnswer,
    recordLearned,
    recordPortalPerfect,
    levelMastery,
  };
}

export type UseGermanCasesReturn = ReturnType<typeof useGermanCases>;
