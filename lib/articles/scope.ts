import { getGrammarPoint } from "@/lib/grammar/curriculum";
import type { GrammarLevelId } from "@/lib/grammar/curriculum";
import { PRACTICE_QUESTIONS, QUIZ_QUESTIONS } from "./questions";
import type { ArticleTrainerScope, CaseId, PracticeQuestion, QuizQuestion } from "./types";

/** Grammar points that launch the article trainer. Genitiv (b1-002) deferred until curriculum adds article-picker. */
export const ARTICLE_TRAINER_POINT_IDS = ["a1-004", "a2-003", "a2-004"] as const;

export type ArticleTrainerPointId = (typeof ARTICLE_TRAINER_POINT_IDS)[number];

interface PointConfig {
  levelId: GrammarLevelId;
  cases: CaseId[];
  quizCases: CaseId[];
  practiceCase: CaseId;
}

const POINT_CONFIG: Record<ArticleTrainerPointId, PointConfig> = {
  "a1-004": {
    levelId: "A1",
    cases: ["nom"],
    quizCases: ["nom"],
    practiceCase: "nom",
  },
  "a2-003": {
    levelId: "A2",
    cases: ["nom", "akk"],
    quizCases: ["nom", "akk"],
    practiceCase: "akk",
  },
  "a2-004": {
    levelId: "A2",
    cases: ["nom", "akk", "dat"],
    quizCases: ["nom", "akk", "dat"],
    practiceCase: "dat",
  },
};

export function isArticleTrainerPoint(pointId: string | null | undefined): pointId is ArticleTrainerPointId {
  if (!pointId) return false;
  return (ARTICLE_TRAINER_POINT_IDS as readonly string[]).includes(pointId);
}

export function supportsArticlePicker(pointId: string): boolean {
  const point = getGrammarPoint(pointId);
  return Boolean(point && point.practiceTypes.includes("article-picker"));
}

function filterQuiz(cases: CaseId[]): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter(q => cases.includes(q.case));
}

function filterPractice(primaryCase: CaseId, fallbackCases: CaseId[]): PracticeQuestion[] {
  const primary = PRACTICE_QUESTIONS.filter(q => q.case === primaryCase);
  if (primary.length >= 4) return primary;
  const expanded = PRACTICE_QUESTIONS.filter(q => fallbackCases.includes(q.case));
  return expanded.length > 0 ? expanded : PRACTICE_QUESTIONS;
}

export function getArticleTrainerScope(pointId: ArticleTrainerPointId): ArticleTrainerScope {
  const config = POINT_CONFIG[pointId];
  return {
    pointId,
    levelId: config.levelId,
    cases: config.cases,
    quizQuestions: filterQuiz(config.quizCases),
    practiceQuestions: filterPractice(config.practiceCase, config.quizCases),
  };
}

export function resolveArticleTrainerPoint(pointId: string | null | undefined): ArticleTrainerPointId | null {
  if (isArticleTrainerPoint(pointId)) return pointId;
  return null;
}

/** Default article table entry when opening from the Grammatik page header link. */
export function getDefaultArticleTrainerPointForLevel(
  levelId: GrammarLevelId,
): ArticleTrainerPointId | null {
  if (levelId === "A1") return "a1-004";
  if (levelId === "A2") return "a2-003";
  return null;
}

export function getArticleTrainerHref(pointId: string): string | null {
  if (!isArticleTrainerPoint(pointId)) return null;
  return `/grammar/articles?point=${encodeURIComponent(pointId)}`;
}
