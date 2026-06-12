import type { GrammarLevelId } from "@/lib/grammar/curriculum";

export type CaseId = "nom" | "akk" | "dat" | "gen";
export type GenderId = "m" | "f" | "n" | "pl";
export type ArticleType = "def" | "indef";

export type ArticleTrainerTab = "learn" | "quiz" | "practice";

export interface QuizQuestion {
  id: string;
  sentence: string;
  blank: string;
  hint: string;
  options: string[];
  explanation: string;
  case: CaseId;
  gender: GenderId;
  type: ArticleType;
}

export interface PracticeQuestion {
  id: string;
  sentence: string;
  answer: string;
  options: string[];
  hint: string;
  explanation: string;
  case: CaseId;
  gender: GenderId;
}

export interface ArticleTrainerScope {
  pointId: string;
  levelId: GrammarLevelId;
  cases: CaseId[];
  quizQuestions: QuizQuestion[];
  practiceQuestions: PracticeQuestion[];
}
