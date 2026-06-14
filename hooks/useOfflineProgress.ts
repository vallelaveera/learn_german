"use client";

import { useCallback, useEffect, useState } from "react";
import {
  computeLevelLearned,
  loadOfflineProgress,
  markWordLearned,
  markWordSeen,
  saveOfflineProgress,
} from "@/lib/offline/progress";
import type { OfflineProgress, OfflineWord } from "@/lib/offline/types";

export function useOfflineProgress(words: OfflineWord[]) {
  const [progress, setProgress] = useState<OfflineProgress>(() => loadOfflineProgress());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadOfflineProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || words.length === 0) return;
    setProgress(prev => {
      const next = computeLevelLearned(prev, words);
      saveOfflineProgress(next);
      return next;
    });
  }, [hydrated, words]);

  const recordSeen = useCallback(
    (word: OfflineWord) => {
      setProgress(prev => {
        const next = computeLevelLearned(markWordSeen(prev, word.id), words);
        saveOfflineProgress(next);
        return next;
      });
    },
    [words],
  );

  const recordFlashcard = useCallback(
    (word: OfflineWord, learned: boolean) => {
      setProgress(prev => {
        const seen = markWordSeen(prev, word.id);
        const next = computeLevelLearned(markWordLearned(seen, word.id, learned), words);
        saveOfflineProgress(next);
        return next;
      });
    },
    [words],
  );

  return {
    progress,
    hydrated,
    recordSeen,
    recordFlashcard,
    learnedCount: progress.learnedWordIds.length,
    streak: progress.currentStreak,
  };
}
