export type OfflineLevel = "A1" | "A2" | "B1" | "B2";

export type OfflineWordCategory =
  | "food"
  | "travel"
  | "work"
  | "home"
  | "people"
  | "shopping"
  | "health"
  | "nature"
  | "daily"
  | "education";

export interface OfflineWord {
  id: string;
  german: string;
  english: string;
  article?: "der" | "die" | "das";
  base?: string;
  level: OfflineLevel;
  category: OfflineWordCategory;
  exampleDe: string;
  exampleEn: string;
  illustrationId?: string;
}

export interface OfflineSentence {
  id: string;
  german: string;
  english: string;
  level: OfflineLevel;
  category: OfflineWordCategory | string;
  grammarNotes?: string;
  illustrationId?: string;
}

export interface OfflineManifest {
  version: number;
  wordCount: number;
  sentenceCount: number;
  updatedAt: string;
}

export interface OfflineBundle {
  manifest: OfflineManifest;
  words: OfflineWord[];
  sentences: OfflineSentence[];
}

export interface OfflineLevelStats {
  seen: number;
  learned: number;
  total: number;
}

export interface OfflineProgress {
  learnedWordIds: string[];
  practicingWordIds: string[];
  seenWordIds: string[];
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  flashcardSessions: number;
  perLevel: Record<OfflineLevel, OfflineLevelStats>;
}

export interface OfflineMeta {
  manifestVersion: number;
  downloadedAt: number;
  lastSyncAt: number;
  wordCount: number;
  sentenceCount: number;
}
