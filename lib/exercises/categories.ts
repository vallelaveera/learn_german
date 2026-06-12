import { getCareerVocabEntries } from "@/lib/career-vocab/load";

export type WordExerciseCategory = "mixed" | "conversation" | "new" | "review" | "career";

export type SentenceExerciseCategory = "everyday" | "call" | "work" | "travel";

export interface ExerciseCategoryMeta {
  id: string;
  emoji: string;
  label: string;
  description: string;
  gradient: string;
  shadow: string;
}

export const WORD_CATEGORIES: ExerciseCategoryMeta[] = [
  {
    id: "mixed",
    emoji: "🎯",
    label: "Mix",
    description: "Neue, gehörte & Wiederholungs-Wörter",
    gradient: "linear-gradient(135deg, #FF9A56 0%, #FF6B35 100%)",
    shadow: "rgba(255, 107, 53, 0.35)",
  },
  {
    id: "conversation",
    emoji: "🗣️",
    label: "Aus Gesprächen",
    description: "Wörter aus deinen Maya-Anrufen",
    gradient: "linear-gradient(135deg, #6EC1FF 0%, #4A90E2 100%)",
    shadow: "rgba(74, 144, 226, 0.35)",
  },
  {
    id: "new",
    emoji: "✨",
    label: "Neue Wörter",
    description: "Noch nicht selbst gesagt",
    gradient: "linear-gradient(135deg, #FFD166 0%, #F4A261 100%)",
    shadow: "rgba(244, 162, 97, 0.35)",
  },
  {
    id: "review",
    emoji: "🔁",
    label: "Wiederholen",
    description: "Festigen, bevor du sie vergisst",
    gradient: "linear-gradient(135deg, #B794F6 0%, #805AD5 100%)",
    shadow: "rgba(128, 90, 213, 0.35)",
  },
  {
    id: "career",
    emoji: "💼",
    label: "Beruf",
    description: "Karriere- & Arbeitsvokabeln",
    gradient: "linear-gradient(135deg, #68D391 0%, #38A169 100%)",
    shadow: "rgba(56, 161, 105, 0.35)",
  },
];

export const SENTENCE_CATEGORIES: ExerciseCategoryMeta[] = [
  {
    id: "everyday",
    emoji: "🏠",
    label: "Alltag",
    description: "Sätze für den täglichen Gebrauch",
    gradient: "linear-gradient(135deg, #FF9A56 0%, #FF6B35 100%)",
    shadow: "rgba(255, 107, 53, 0.35)",
  },
  {
    id: "call",
    emoji: "📞",
    label: "Aus Anruf",
    description: "Korrekturen aus deinem Gespräch",
    gradient: "linear-gradient(135deg, #6EC1FF 0%, #4A90E2 100%)",
    shadow: "rgba(74, 144, 226, 0.35)",
  },
  {
    id: "work",
    emoji: "💼",
    label: "Beruf",
    description: "Arbeit, Bewerbung & Büro",
    gradient: "linear-gradient(135deg, #68D391 0%, #38A169 100%)",
    shadow: "rgba(56, 161, 105, 0.35)",
  },
  {
    id: "travel",
    emoji: "✈️",
    label: "Reise",
    description: "Unterwegs & im Urlaub",
    gradient: "linear-gradient(135deg, #FFD166 0%, #F4A261 100%)",
    shadow: "rgba(244, 162, 97, 0.35)",
  },
];

const WORK_KEYWORDS = [
  "arbeit", "stelle", "unternehmen", "bewerb", "software", "woche", "gespräch",
  "kolleg", "beruf", "meeting", "projekt", "chef", "büro", "gehalt", "team",
  "präsentation", "bericht", "frist", "bewerbung", "karriere",
];
const TRAVEL_KEYWORDS = [
  "reise", "hotel", "flughafen", "zug", "ticket", "urlaub", "bus", "bahn",
  "koffer", "flug", "unterwegs", "stadt", "karte", "fahrer", "verspätung",
  "autobahn", "stau", "landet", "u-bahn",
];

function inferTopicBatchCategory(german: string): string {
  const lower = german.toLowerCase();
  if (/(zug|bus|bahn|flug|ticket|fahr|reise|hotel|flughafen|landet|stau|autobahn)/.test(lower)) {
    return "transport";
  }
  if (/(kaffee|esse|trink|koch|restaurant|brot|kuchen|suppe|hunger)/.test(lower)) {
    return "food";
  }
  if (/(arbeit|stelle|meeting|büro|chef|projekt|bewerb|bericht|präsentation|frist)/.test(lower)) {
    return "career";
  }
  if (/(freue|müde|stolz|dankbar|ärger|lacht|aufgeregt|gefühl|heimweh|entscheidung)/.test(lower)) {
    return "emotions";
  }
  return "daily_life";
}

export function inferSentenceExerciseCategory(german: string): SentenceExerciseCategory {
  const topic = inferTopicBatchCategory(german);
  if (topic === "transport") return "travel";
  if (topic === "career") return "work";
  return "everyday";
}

export function matchesSentenceCategory(german: string, category: SentenceExerciseCategory): boolean {
  if (category === "call") return false;
  return inferSentenceExerciseCategory(german) === category;
}

export function matchesWordCategory(german: string, category: WordExerciseCategory): boolean {
  if (category !== "career") return true;
  const lower = german.toLowerCase().trim();
  if (WORK_KEYWORDS.some(k => lower.includes(k))) return true;
  return getCareerVocabEntries().some(e => e.text.toLowerCase() === lower);
}

export function getWordCategoryMeta(id: string): ExerciseCategoryMeta | undefined {
  return WORD_CATEGORIES.find(c => c.id === id);
}

export function getSentenceCategoryMeta(id: string): ExerciseCategoryMeta | undefined {
  return SENTENCE_CATEGORIES.find(c => c.id === id);
}

export function parseWordCategory(raw: string | null): WordExerciseCategory {
  const valid: WordExerciseCategory[] = ["mixed", "conversation", "new", "review", "career"];
  return valid.includes(raw as WordExerciseCategory) ? (raw as WordExerciseCategory) : "mixed";
}

export function parseSentenceCategory(raw: string | null): SentenceExerciseCategory {
  const valid: SentenceExerciseCategory[] = ["everyday", "call", "work", "travel"];
  return valid.includes(raw as SentenceExerciseCategory) ? (raw as SentenceExerciseCategory) : "everyday";
}
