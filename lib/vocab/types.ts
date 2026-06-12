export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** Dynamic slug — validated against Redis taxonomy at generation time. */
export type VocabCategory = string;

export type SentenceType = "statement" | "question" | "response";

export interface SentenceInput {
  de: string;
  en: string;
  level: CEFRLevel;
  category: VocabCategory;
  topic?: string;
  type?: SentenceType;
}

export interface SavedSentence extends SentenceInput {
  id: string;
  source: "generated";
  createdAt: number;
}

export interface WordInput {
  de: string;
  en: string;
  level: CEFRLevel;
  category: VocabCategory;
  topic?: string;
  distractors: string[];
}

export interface SavedWord extends WordInput {
  id: string;
  source: "generated";
  createdAt: number;
}

export type WordPriority = "high" | "medium" | "low";

/** Imported / unified vocabulary entry (global corpus). */
export interface UnifiedWord {
  id: string;
  text: string;
  translation: string;
  level: CEFRLevel;
  category: VocabCategory;
  seenCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  correctCount?: number;
  article?: string; // der/die/das
  base?: string; // word without article
  plural?: string; // plural form
  example?: string; // example sentence
  priority?: WordPriority;
  type?: string;
}

/** Dataset import shape (e.g. JSON vocabulary bank). */
export interface ImportWordInput {
  id?: string;
  text: string;
  translation: string;
  level: CEFRLevel;
  category: VocabCategory;
  type?: string;
  article?: string;
  base?: string;
  plural?: string;
  example?: string;
  priority?: WordPriority;
}
