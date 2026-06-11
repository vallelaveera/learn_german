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
