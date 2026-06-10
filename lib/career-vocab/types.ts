export type CareerVocabCategoryId =
  | "technical"
  | "ai_ml"
  | "work_actions"
  | "job_profile"
  | "benefits"
  | "workplace"
  | "common_work";

export type CareerVocabEntryType =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "phrase";

export type CareerVocabLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type CareerVocabPriority = "high" | "medium" | "low";

export interface CareerVocabCategory {
  id: CareerVocabCategoryId;
  label: string;
  labelDe?: string;
  color?: string;
}

export interface CareerVocabMeta {
  version: number;
  language: string;
  tracks?: string[];
  source?: string;
  generatedAt?: string;
}

/** Static bank entry — same shape for JSON uploads and future DB imports. */
export interface CareerVocabEntry {
  id: string;
  text: string;
  type: CareerVocabEntryType;
  category: CareerVocabCategoryId;
  level: CareerVocabLevel;
  english: string;
  priority: CareerVocabPriority;
  industries?: string[];
  variants?: string[];
  related?: string[];
  tags?: string[];
  notes?: string;
}

export interface CareerVocabBank {
  meta: CareerVocabMeta;
  categories: CareerVocabCategory[];
  entries: CareerVocabEntry[];
}

/** Per-user overlay — stored in Redis later, keyed by entry id. */
export interface CareerVocabUserEntryProgress {
  entryId: string;
  usedByUser: boolean;
  timesUsed: number;
  firstUsedAt?: number;
  lastUsedAt?: number;
  exposedByMaya?: boolean;
}

export interface CareerVocabUserProgress {
  userId: string;
  updatedAt: number;
  entries: Record<string, CareerVocabUserEntryProgress>;
}
