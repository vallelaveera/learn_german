"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GenderAchievements,
  GenderArticle,
  GermanGenderState,
  GenderStats,
} from "@/lib/gender/types";

const STORAGE_KEY = "german_gender_trainer_v1";

function emptyStats(): GenderStats {
  return {
    der: { correct: 0, total: 0 },
    die: { correct: 0, total: 0 },
    das: { correct: 0, total: 0 },
    learned: [],
  };
}

function defaultAchievements(): GenderAchievements {
  return {
    sentenceGraduate: false,
    wordCollector: false,
    genderMaster: false,
    sortStreak: false,
  };
}

function defaultState(): GermanGenderState {
  return {
    xp: 0,
    graduated: false,
    sentenceCorrect: 0,
    sentenceTotal: 0,
    roundNum: 1,
    stats: emptyStats(),
    achievements: defaultAchievements(),
    streak: 0,
    sortStreak: 0,
    graduationDismissed: false,
  };
}

function loadState(): GermanGenderState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<GermanGenderState>;
    return {
      ...defaultState(),
      ...parsed,
      stats: { ...emptyStats(), ...parsed.stats, learned: parsed.stats?.learned ?? [] },
      achievements: { ...defaultAchievements(), ...parsed.achievements },
    };
  } catch {
    return defaultState();
  }
}

function persistState(state: GermanGenderState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sentenceAccuracy(state: GermanGenderState): number {
  if (state.sentenceTotal === 0) return 0;
  return Math.round((state.sentenceCorrect / state.sentenceTotal) * 100);
}

function overallAccuracy(stats: GenderStats): number {
  const total = stats.der.total + stats.die.total + stats.das.total;
  if (total === 0) return 0;
  const correct = stats.der.correct + stats.die.correct + stats.das.correct;
  return Math.round((correct / total) * 100);
}

function syncAchievements(state: GermanGenderState): GenderAchievements {
  const acc = sentenceAccuracy(state);
  const learnedCount = state.stats.learned.length;
  const oa = overallAccuracy(state.stats);
  return {
    sentenceGraduate: state.achievements.sentenceGraduate || acc >= 80,
    wordCollector: state.achievements.wordCollector || learnedCount >= 50,
    genderMaster: state.achievements.genderMaster || oa >= 90,
    sortStreak: state.achievements.sortStreak || state.sortStreak >= 5,
  };
}

export function useGermanGender() {
  const [state, setState] = useState<GermanGenderState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [showGraduation, setShowGraduation] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistState(state);
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<GermanGenderState>) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      next.achievements = syncAchievements(next);
      return next;
    });
  }, []);

  const addXp = useCallback((amount: number) => {
    setState(prev => ({ ...prev, xp: prev.xp + amount }));
  }, []);

  const recordSentenceAttempt = useCallback((correct: boolean) => {
    setState(prev => {
      const sentenceCorrect = prev.sentenceCorrect + (correct ? 1 : 0);
      const sentenceTotal = prev.sentenceTotal + 1;
      const next: GermanGenderState = {
        ...prev,
        sentenceCorrect,
        sentenceTotal,
      };
      next.achievements = syncAchievements(next);
      const acc = sentenceTotal >= 3 ? (sentenceCorrect / sentenceTotal) * 100 : 0;
      if (acc >= 80 && sentenceTotal >= 3 && !prev.graduationDismissed && !prev.graduated) {
        setShowGraduation(true);
      }
      return next;
    });
  }, []);

  const recordSortResult = useCallback((correct: boolean, wordId: string, bucket: GenderArticle) => {
    setState(prev => {
      const learned = prev.stats.learned.includes(wordId)
        ? prev.stats.learned
        : [...prev.stats.learned, wordId];
      const sortStreak = correct ? prev.sortStreak + 1 : 0;
      const stats = {
        ...prev.stats,
        der: { ...prev.stats.der },
        die: { ...prev.stats.die },
        das: { ...prev.stats.das },
        learned,
      };
      stats[bucket].total += 1;
      if (correct) stats[bucket].correct += 1;
      const next: GermanGenderState = {
        ...prev,
        streak: correct ? prev.streak + 1 : 0,
        sortStreak,
        stats,
      };
      next.achievements = syncAchievements(next);
      return next;
    });
  }, []);

  const recordDragDropResult = useCallback(
    (results: { article: GenderArticle; correct: boolean }[]) => {
      setState(prev => {
        const stats = { ...prev.stats, der: { ...prev.stats.der }, die: { ...prev.stats.die }, das: { ...prev.stats.das } };
        for (const r of results) {
          stats[r.article].total += 1;
          if (r.correct) stats[r.article].correct += 1;
        }
        const next: GermanGenderState = { ...prev, stats };
        next.achievements = syncAchievements(next);
        return next;
      });
    },
    [],
  );

  const advanceRound = useCallback(() => {
    setState(prev => ({ ...prev, roundNum: prev.roundNum + 1 }));
  }, []);

  const unlockGraduation = useCallback(() => {
    setState(prev => {
      const next: GermanGenderState = {
        ...prev,
        graduated: true,
        graduationDismissed: true,
        achievements: { ...prev.achievements, sentenceGraduate: true },
      };
      return next;
    });
    setShowGraduation(false);
  }, []);

  const dismissGraduation = useCallback(() => {
    setState(prev => ({
      ...prev,
      graduationDismissed: true,
      achievements: syncAchievements({ ...prev, achievements: { ...prev.achievements, sentenceGraduate: true } }),
    }));
    setShowGraduation(false);
  }, []);

  const accuracy = useMemo(() => sentenceAccuracy(state), [state]);
  const totalAccuracy = useMemo(() => overallAccuracy(state.stats), [state.stats]);

  return {
    ...state,
    hydrated,
    accuracy,
    totalAccuracy,
    showGraduation,
    addXp,
    update,
    recordSentenceAttempt,
    recordSortResult,
    recordDragDropResult,
    advanceRound,
    unlockGraduation,
    dismissGraduation,
  };
}

export type UseGermanGenderReturn = ReturnType<typeof useGermanGender>;
