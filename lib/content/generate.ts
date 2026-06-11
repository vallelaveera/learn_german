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
  const tryParse = (raw: string): T[] | null => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      return null;
    }
    return null;
  };

  const stripped = text.replace(/```json|```/g, "").trim();
  const direct = tryParse(stripped);
  if (direct) return direct;

  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start >= 0 && end > start) {
    return tryParse(stripped.slice(start, end + 1));
  }

  return null;
}

export const EXCLUDE_LIST_CAP = 80;

export interface GenerateParams {
  level: CEFRLevel;
  category: VocabCategory;
  topic?: string;
  count: number;
  /** Existing German entries to avoid duplicating in generation. */
  excludeDe?: string[];
}

export function buildExcludeClause(excludeDe?: string[]): string {
  if (!excludeDe?.length) return "";
  const unique = Array.from(new Set(excludeDe.map(d => d.trim()).filter(Boolean)));
  const list = unique.slice(0, EXCLUDE_LIST_CAP);
  const omitted = unique.length - list.length;
  const lines = list.map(d => `- ${d}`).join("\n");
  const tail =
    omitted > 0
      ? `\n(...and ${omitted} more — do not repeat any of them either)`
      : "";
  return `\n\nAlready in the corpus for this category and level — do NOT duplicate or repeat these German entries:\n${lines}${tail}\nGenerate completely NEW entries only.`;
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
- Maximum ${MAX_GERMAN_WORDS} words per German sentence — never exceed this; aim for 5–8 when possible
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
Each German sentence must be at most ${MAX_GERMAN_WORDS} words (5–8 preferred). Shorter is better.
Return only the JSON array.${buildExcludeClause(params.excludeDe)}`;
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
