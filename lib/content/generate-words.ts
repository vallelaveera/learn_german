import { callClaude, parseJsonArray, type GenerateParams } from "./generate";
import type { CEFRLevel, VocabCategory, WordInput } from "@/lib/vocab/types";
import { countGermanWords, isWithinWordLimit, MAX_VOCAB_WORDS } from "./vocab-word-count";

interface GeneratedWord {
  de: string;
  en: string;
  level: CEFRLevel;
  category: VocabCategory;
  topic?: string;
  distractors: string[];
}

const SYSTEM_PROMPT = `You are an expert German language teacher creating 
vocabulary entries for a flashcard app.

Rules:
- Each entry is ONE useful German word or short phrase (max ${MAX_VOCAB_WORDS} words)
- Prefer single nouns, verbs, adjectives, or short collocations learners need in conversation
- No full sentences — vocabulary only
- No brand names, no proper nouns, no political topics
- Vocabulary must match the stated CEFR level exactly
- Include exactly 2 English distractors — plausible but clearly wrong translations
- Distractors must not duplicate the correct English translation
- German entries must use correct articles for nouns where natural (e.g. "der Vertrag")

Output ONLY valid JSON array, no markdown, no commentary:
[
  {
    "de": "der Vertrag",
    "en": "the contract",
    "level": "B1",
    "category": "career",
    "topic": "job interview",
    "distractors": ["the application", "the salary"]
  }
]`;

function buildUserPrompt(params: GenerateParams): string {
  const topicClause = params.topic ? `, topic ${params.topic}` : "";
  return `Generate ${params.count} German vocabulary entries for level ${params.level}, category ${params.category}${topicClause}.
Each German entry must be at most ${MAX_VOCAB_WORDS} words. Single words preferred.
Return only the JSON array.`;
}

function normalizeWord(raw: GeneratedWord, params: GenerateParams): WordInput | null {
  if (!raw.de || !raw.en || !Array.isArray(raw.distractors)) return null;
  const distractors = raw.distractors.filter(Boolean).map(d => d.trim()).slice(0, 2);
  if (distractors.length < 2) return null;
  return {
    de: raw.de.trim(),
    en: raw.en.trim(),
    level: raw.level ?? params.level,
    category: raw.category ?? params.category,
    topic: raw.topic ?? params.topic,
    distractors,
  };
}

export async function generateWords(params: GenerateParams): Promise<WordInput[]> {
  const count = Math.min(Math.max(params.count, 1), 50);

  try {
    const text = await callClaude(SYSTEM_PROMPT, buildUserPrompt({ ...params, count }));
    const parsed = parseJsonArray<GeneratedWord>(text);

    if (!parsed) {
      console.error("[generate-words] JSON parse failed:", text.slice(0, 500));
      return [];
    }

    return parsed
      .map(item => normalizeWord(item, params))
      .filter((w): w is WordInput => {
        if (w === null) return false;
        if (isWithinWordLimit(w.de)) return true;
        console.warn(
          "[generate-words] dropped (too long)",
          JSON.stringify({ de: w.de, words: countGermanWords(w.de), max: MAX_VOCAB_WORDS })
        );
        return false;
      });
  } catch (e) {
    console.error("[generate-words] Claude call failed:", e);
    return [];
  }
}
