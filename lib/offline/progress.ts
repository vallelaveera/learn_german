import type { OfflineLevel, OfflineProgress, OfflineLevelStats } from "./types";
import { OFFLINE_LEVELS, OFFLINE_PROGRESS_KEY } from "./constants";

function emptyLevelStats(): Record<OfflineLevel, OfflineLevelStats> {
  return {
    A1: { seen: 0, learned: 0, total: 0 },
    A2: { seen: 0, learned: 0, total: 0 },
    B1: { seen: 0, learned: 0, total: 0 },
    B2: { seen: 0, learned: 0, total: 0 },
  };
}

export function defaultOfflineProgress(): OfflineProgress {
  return {
    learnedWordIds: [],
    practicingWordIds: [],
    seenWordIds: [],
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    flashcardSessions: 0,
    perLevel: emptyLevelStats(),
  };
}

export function loadOfflineProgress(): OfflineProgress {
  if (typeof window === "undefined") return defaultOfflineProgress();
  try {
    const raw = localStorage.getItem(OFFLINE_PROGRESS_KEY);
    if (!raw) return defaultOfflineProgress();
    const parsed = JSON.parse(raw) as Partial<OfflineProgress>;
    return {
      ...defaultOfflineProgress(),
      ...parsed,
      perLevel: { ...emptyLevelStats(), ...parsed.perLevel },
    };
  } catch {
    return defaultOfflineProgress();
  }
}

export function saveOfflineProgress(progress: OfflineProgress): void {
  localStorage.setItem(OFFLINE_PROGRESS_KEY, JSON.stringify(progress));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function bumpStreak(progress: OfflineProgress): OfflineProgress {
  const today = todayKey();
  if (progress.lastPracticeDate === today) return progress;
  const nextStreak =
    progress.lastPracticeDate === yesterdayKey() ? progress.currentStreak + 1 : 1;
  return {
    ...progress,
    currentStreak: nextStreak,
    longestStreak: Math.max(progress.longestStreak, nextStreak),
    lastPracticeDate: today,
  };
}

export function markWordSeen(
  progress: OfflineProgress,
  wordId: string,
): OfflineProgress {
  if (progress.seenWordIds.includes(wordId)) return progress;
  return {
    ...progress,
    seenWordIds: [...progress.seenWordIds, wordId],
  };
}

export function markWordLearned(
  progress: OfflineProgress,
  wordId: string,
  learned: boolean,
): OfflineProgress {
  let learnedWordIds = [...progress.learnedWordIds];
  let practicingWordIds = [...progress.practicingWordIds];

  if (learned) {
    if (!learnedWordIds.includes(wordId)) learnedWordIds.push(wordId);
    practicingWordIds = practicingWordIds.filter(id => id !== wordId);
  } else {
    learnedWordIds = learnedWordIds.filter(id => id !== wordId);
    if (!practicingWordIds.includes(wordId)) practicingWordIds.push(wordId);
  }

  return bumpStreak({
    ...progress,
    learnedWordIds,
    practicingWordIds,
    flashcardSessions: progress.flashcardSessions + 1,
  });
}

export function computeLevelLearned(
  progress: OfflineProgress,
  words: { id: string; level: OfflineLevel }[],
): OfflineProgress {
  const perLevel = emptyLevelStats();
  for (const level of OFFLINE_LEVELS) {
    const levelWords = words.filter(w => w.level === level);
    perLevel[level] = {
      total: levelWords.length,
      learned: levelWords.filter(w => progress.learnedWordIds.includes(w.id)).length,
      seen: levelWords.filter(w => progress.seenWordIds.includes(w.id)).length,
    };
  }
  return { ...progress, perLevel };
}
