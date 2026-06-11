export interface FlashCardEntry {
  id: string;
  german: string;
  english: string;
  distractors: string[];
  level?: string;
}

export interface BinaryCard {
  id: string;
  german: string;
  optionA: string;
  optionB: string;
  correctOption: "A" | "B";
  level?: string;
  source?: string;
}

export interface SpellingItem {
  id: string;
  label: string;
  answer: string;
  hint?: string;
  context?: string;
}

export interface ExerciseResult {
  itemId: string;
  german: string;
  correct: boolean;
  type: "warmup" | "placement" | "spelling" | "sentence";
  ts: number;
}

export type PlacementLevel = "A1" | "A2" | "B1";

export interface PlacementRound {
  level: PlacementLevel;
  cards: BinaryCard[];
}
