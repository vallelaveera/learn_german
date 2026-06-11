import type { CEFRLevel, SentenceInput, SentenceType, VocabCategory } from "@/lib/vocab/types";
import { countGermanWords, isWithinWordLimit, MAX_GERMAN_WORDS } from "./word-count";

const MODEL = "claude-haiku-4-5";

export async function callClaude(
  system: string,
  user: string,
  maxTokens = 4096
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return (data.content?.[0]?.text ?? "").trim();
}

export function parseJsonArray<T>(text: string): T[] | null {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return null;
    return parsed as T[];
  } catch {
    return null;
  }
}

export interface GenerateParams {
  level: CEFRLevel;
  category: VocabCategory;
  topic?: string;
  count: number;
}

interface GeneratedSentence {
  de: string;
  en: string;
  level: CEFRLevel;
  category: VocabCategory;
  topic?: string;
  type?: SentenceType;
}

const SYSTEM_PROMPT = `You are an expert German language teacher creating 
practice sentences for learners.

Rules:
- Every sentence must be natural spoken German
- Maximum ${MAX_GERMAN_WORDS} words per German sentence — count every word, never exceed this
- Keep sentences short and simple, like spoken phrases in real conversation
- No brand names, no proper nouns, no political topics
- No incomplete sentences
- No sentences that only make sense with context
- Vocabulary and grammar must match the CEFR level exactly
- Mix statement, question, and response sentence types
- Each sentence must be usable standalone in a conversation

Output ONLY valid JSON array, no markdown, no commentary:
[
  {
    "de": "German sentence here",
    "en": "English translation here",
    "level": "B1",
    "category": "career",
    "topic": "job interview",
    "type": "statement" | "question" | "response"
  }
]`;

function buildUserPrompt(params: GenerateParams): string {
  const topicClause = params.topic ? `, topic ${params.topic}` : "";
  return `Generate ${params.count} German sentences for level ${params.level}, category ${params.category}${topicClause}.
Each German sentence must be at most ${MAX_GERMAN_WORDS} words. Shorter is better.
Return only the JSON array.`;
}

function normalizeSentence(raw: GeneratedSentence, params: GenerateParams): SentenceInput | null {
  if (!raw.de || !raw.en) return null;
  return {
    de: raw.de.trim(),
    en: raw.en.trim(),
    level: raw.level ?? params.level,
    category: raw.category ?? params.category,
    topic: raw.topic ?? params.topic,
    type: raw.type,
  };
}

export async function generateSentences(params: GenerateParams): Promise<SentenceInput[]> {
  const count = Math.min(Math.max(params.count, 1), 50);

  try {
    const text = await callClaude(SYSTEM_PROMPT, buildUserPrompt({ ...params, count }));
    const parsed = parseJsonArray<GeneratedSentence>(text);

    if (!parsed) {
      console.error("[generate] JSON parse failed:", text.slice(0, 500));
      return [];
    }

    return parsed
      .map(item => normalizeSentence(item, params))
      .filter((s): s is SentenceInput => {
        if (s === null) return false;
        if (isWithinWordLimit(s.de)) return true;
        console.warn(
          "[generate] dropped (too long)",
          JSON.stringify({ de: s.de, words: countGermanWords(s.de), max: MAX_GERMAN_WORDS })
        );
        return false;
      });
  } catch (e) {
    console.error("[generate] Claude call failed:", e);
    return [];
  }
}
