export type PracticeReportType = "words" | "sentences" | "grammar" | "gender";

export interface SessionReportItem {
  prompt: string;
  userAnswer?: string;
  correctAnswer: string;
  correct: boolean;
  explanation?: string;
  english?: string;
}

export interface PracticeSessionReport {
  id: string;
  userId: string;
  type: PracticeReportType;
  category: string;
  title: string;
  startedAt: number;
  endedAt: number;
  score: number;
  total: number;
  items: SessionReportItem[];
}

export interface PracticeReportSummary {
  id: string;
  type: PracticeReportType;
  category: string;
  title: string;
  score: number;
  total: number;
  endedAt: number;
}

export interface SessionReportMeta {
  type: PracticeReportType;
  category: string;
  title: string;
}
