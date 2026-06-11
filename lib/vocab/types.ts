export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type VocabCategory =
  | "career"
  | "travel"
  | "food"
  | "health"
  | "housing"
  | "daily_life"
  | "finance"
  | "transport"
  | "social";

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
