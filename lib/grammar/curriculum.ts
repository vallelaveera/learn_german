import curriculumData from "@/public/data/german_grammar_curriculum.json";

import { normalizeGermanLevel } from "@/lib/levels";

export type GrammarLevelId = "A1" | "A2" | "B1" | "B2" | "C1";

export interface GrammarExample {
  de: string;
  en: string;
}

export interface GrammarPoint {
  id: string;
  title: string;
  subtitle: string;
  english: string;
  explanation: string;
  example: GrammarExample;
  practiceTypes: string[];
  svgIcon: string;
  priority: string;
  order: number;
}

export type GrammarPointWithLevel = GrammarPoint & { level: GrammarLevelId };

export interface GrammarLevel {
  id: GrammarLevelId;
  label: string;
  color: string;
  lightColor: string;
  description: string;
  points: GrammarPoint[];
}

export interface GrammarCurriculum {
  meta: {
    version: number;
    language: string;
    title: string;
    description: string;
    totalPoints: number;
    generatedAt: string;
  };
  levels: GrammarLevel[];
}

export const GRAMMAR_CURRICULUM = curriculumData as GrammarCurriculum;

export const GRAMMAR_LEVELS = GRAMMAR_CURRICULUM.levels;

export const GRAMMAR_LEVEL_IDS: GrammarLevelId[] = ["A1", "A2", "B1", "B2", "C1"];

export const GRAMMAR_CALL_STORAGE_KEY = "cmd_grammar_call_context";

export const PRACTICE_TYPE_LABELS: Record<string, string> = {
  flashcard: "Karteikarten",
  "fill-in-blank": "Lückentext",
  match: "Zuordnen",
  "conjugation-table": "Konjugation",
  "call-practice": "Freisprechen",
  "sentence-builder": "Satzbau",
  "word-order-drag": "Wortstellung",
  "true-false": "Richtig / Falsch",
  listening: "Hörverstehen",
  "article-picker": "Artikel wählen",
  "case-identifier": "Fall erkennen",
  "preposition-match": "Präpositionen",
};

export function getGrammarLevel(id: GrammarLevelId): GrammarLevel | undefined {
  return GRAMMAR_LEVELS.find(l => l.id === id);
}

/** Map profile CEFR level to the grammar curriculum tab (C2 → C1). */
export function defaultGrammarLevelId(profileLevel?: string): GrammarLevelId {
  const level = normalizeGermanLevel(profileLevel);
  if (level === "C2") return "C1";
  if (GRAMMAR_LEVEL_IDS.includes(level as GrammarLevelId)) {
    return level as GrammarLevelId;
  }
  return "A1";
}

export function visiblePracticeTypes(types: string[]): string[] {
  return types.filter(type => type !== "call-practice");
}

export function getGrammarPoint(id: string): GrammarPointWithLevel | null {
  for (const level of GRAMMAR_LEVELS) {
    const point = level.points.find(p => p.id === id);
    if (point) return { ...point, level: level.id };
  }
  return null;
}

export function findGrammarPointInLevel(
  levelId: GrammarLevelId,
  pointId: string,
): GrammarPoint | undefined {
  return getGrammarLevel(levelId)?.points.find(p => p.id === pointId);
}

export function buildGrammarSystemPromptAppendix(point: GrammarPointWithLevel): string {
  return `

GRAMMAR FOCUS FOR THIS SESSION:
Topic: ${point.title}
Rule: ${point.explanation}
Example: "${point.example.de}" 
  (${point.example.en})
Level: ${point.level || ""}

Instructions for Maya:
- Weave this grammar point naturally 
  into conversation — do not lecture
- Give one clear example in the first 
  two messages
- Ask the user to make a sentence 
  using this structure
- Gently correct mistakes related to 
  this specific point
- Praise correct usage warmly
`;
}

export function practiceTypeLabel(type: string): string {
  return PRACTICE_TYPE_LABELS[type] ?? type.replace(/-/g, " ");
}

export function buildGrammarCallContext(point: GrammarPoint, levelId: GrammarLevelId) {
  return {
    id: point.id,
    level: levelId,
    title: point.title,
    subtitle: point.subtitle,
    english: point.english,
    explanation: point.explanation,
    exampleDe: point.example.de,
    exampleEn: point.example.en,
    prompt: [
      `Grammatik-Thema: ${point.title} (${point.subtitle}).`,
      point.explanation,
      `Beispiel: ${point.example.de}`,
      "Übe dieses Thema mit kurzen Fragen, Beispielsätzen und sanften Korrekturen.",
    ].join(" "),
  };
}
