import type { GrammarCategory, VerifiedLevel } from "./verified-curriculum";

export type VerifiedExampleExerciseType =
  | "fill_blank"
  | "recognize"
  | "error_correct"
  | "drag_sort";

export interface VerifiedGrammarExample {
  de?: string;
  en?: string;
  de_blank?: string;
  answer?: string;
  answers?: string[];
  note?: string;
  subcategory?: string;
  exercise_type: VerifiedExampleExerciseType;
  case?: string;
  gender?: string;
  infinitiv?: string;
  context_flag?: boolean;
  context_note?: string;
  de_wrong?: string;
  de_correct?: string;
}

export interface VerifiedExamplesFile {
  _meta: {
    total_examples?: number;
    levels?: string[];
    categories?: string[];
  };
  examples: Record<VerifiedLevel, Record<GrammarCategory, VerifiedGrammarExample[]>>;
}

export interface ExerciseMeta {
  explanation?: string;
  contextSentence?: string;
  contextNote?: string;
  subcategory?: string;
  sourceIndex?: number;
}

export interface TransformedExample {
  spec: string;
  meta: ExerciseMeta;
  dedupeKey: string;
}

export type SubcategoryIndex = Record<
  VerifiedLevel,
  Partial<Record<GrammarCategory, Record<string, number[]>>>
>;
