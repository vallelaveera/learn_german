import type { SentenceExerciseCategory, WordExerciseCategory } from "./categories";

export interface PracticeScenario {
  id: string;
  emoji: string;
  label: string;
  keywords: string[];
  wordCategory: WordExerciseCategory;
  sentenceCategory: SentenceExerciseCategory;
  /** Short instruction injected into Maya's call prompt */
  callPrompt: string;
  gradient: string;
  shadow: string;
}

export const PRACTICE_SCENARIOS: PracticeScenario[] = [
  {
    id: "cafe",
    emoji: "☕",
    label: "Café",
    keywords: ["kaffee", "kuchen", "bestell", "tisch", "café", "barista", "milch"],
    wordCategory: "mixed",
    sentenceCategory: "everyday",
    callPrompt: "Role-play ordering at a café — drinks, cake, paying, small talk with staff.",
    gradient: "linear-gradient(135deg, #FFD166 0%, #F4A261 100%)",
    shadow: "rgba(244, 162, 97, 0.35)",
  },
  {
    id: "shopping",
    emoji: "🛒",
    label: "Einkaufen",
    keywords: ["kauf", "laden", "preis", "größe", "kasse", "markt", "supermarkt"],
    wordCategory: "mixed",
    sentenceCategory: "everyday",
    callPrompt: "Role-play shopping — sizes, prices, returns, asking for help in a store.",
    gradient: "linear-gradient(135deg, #FF9A56 0%, #FF6B35 100%)",
    shadow: "rgba(255, 107, 53, 0.35)",
  },
  {
    id: "uni",
    emoji: "🎓",
    label: "Uni",
    keywords: ["universität", "professor", "vorlesung", "studium", "prüfung", "campus", "seminar"],
    wordCategory: "mixed",
    sentenceCategory: "everyday",
    callPrompt: "Talk about university life — classes, exams, campus, study routines.",
    gradient: "linear-gradient(135deg, #6EC1FF 0%, #4A90E2 100%)",
    shadow: "rgba(74, 144, 226, 0.35)",
  },
  {
    id: "job",
    emoji: "💼",
    label: "Arbeit",
    keywords: ["arbeit", "büro", "kolleg", "meeting", "projekt", "bewerb", "chef"],
    wordCategory: "career",
    sentenceCategory: "work",
    callPrompt: "Workplace German — meetings, tasks, colleagues, job interview small talk.",
    gradient: "linear-gradient(135deg, #68D391 0%, #38A169 100%)",
    shadow: "rgba(56, 161, 105, 0.35)",
  },
  {
    id: "home",
    emoji: "🏠",
    label: "Zuhause",
    keywords: ["wohnung", "küche", "familie", "kochen", "putzen", "nachbar", "zimmer"],
    wordCategory: "mixed",
    sentenceCategory: "everyday",
    callPrompt: "Everyday home life — cooking, chores, family, roommates, weekend plans.",
    gradient: "linear-gradient(135deg, #B794F6 0%, #805AD5 100%)",
    shadow: "rgba(128, 90, 213, 0.35)",
  },
  {
    id: "travel",
    emoji: "✈️",
    label: "Reise",
    keywords: ["reise", "hotel", "zug", "ticket", "flughafen", "koffer", "bahn"],
    wordCategory: "mixed",
    sentenceCategory: "travel",
    callPrompt: "Travel scenarios — tickets, hotels, directions, delays, sightseeing.",
    gradient: "linear-gradient(135deg, #FFD166 0%, #E89B0C 100%)",
    shadow: "rgba(232, 155, 12, 0.35)",
  },
  {
    id: "doctor",
    emoji: "🏥",
    label: "Arzt",
    keywords: ["arzt", "krank", "schmerz", "termin", "apotheke", "medizin", "symptom"],
    wordCategory: "mixed",
    sentenceCategory: "everyday",
    callPrompt: "Doctor visit — symptoms, appointments, pharmacy, feeling unwell.",
    gradient: "linear-gradient(135deg, #FC8181 0%, #E05A4A 100%)",
    shadow: "rgba(224, 90, 74, 0.35)",
  },
  {
    id: "friends",
    emoji: "👋",
    label: "Freunde",
    keywords: ["freund", "treffen", "party", "wochenende", "kino", "pläne", "feier"],
    wordCategory: "conversation",
    sentenceCategory: "everyday",
    callPrompt: "Casual hangout chat — making plans, gossip, hobbies, what you did last weekend.",
    gradient: "linear-gradient(135deg, #FF9A56 0%, #FF6B35 100%)",
    shadow: "rgba(255, 107, 53, 0.3)",
  },
];

export function getScenario(id: string | null | undefined): PracticeScenario | undefined {
  if (!id) return undefined;
  return PRACTICE_SCENARIOS.find(s => s.id === id);
}

export function parseScenarioId(raw: string | null): string | null {
  if (!raw) return null;
  return PRACTICE_SCENARIOS.some(s => s.id === raw) ? raw : null;
}

export function matchesScenario(text: string, scenario: PracticeScenario): boolean {
  const lower = text.toLowerCase();
  return scenario.keywords.some(k => lower.includes(k));
}

export function scenarioProgressFromWords(
  words: { word: string; usedByUser?: boolean }[],
  scenario: PracticeScenario,
): { heard: number; practiced: number } {
  let heard = 0;
  let practiced = 0;
  for (const w of words) {
    if (!matchesScenario(w.word, scenario)) continue;
    heard += 1;
    if (w.usedByUser) practiced += 1;
  }
  return { heard, practiced };
}
