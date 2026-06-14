import { buildExcludeClause, parseJsonArray, type GenerateParams } from "./generate";
import { callAdminLlm } from "./llm-provider";
import { buildCorpusSourceIntegrityBlock } from "./source-integrity";
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

function buildWordSystemPrompt(level: CEFRLevel): string {
  return `You are a German curriculum editor for CallMeDaily, compiling vocabulary from verified teaching word lists.

${buildCorpusSourceIntegrityBlock(level)}

VOCABULARY RULES:
- Each entry is ONE useful German word or short phrase (max ${MAX_VOCAB_WORDS} words)
- Prefer high-frequency nouns, verbs, adjectives, or short collocations from standard ${level} word lists
- No full sentences — vocabulary only
- Nouns MUST use the correct article: der (m), die (f), das (n) — e.g. "der Mietvertrag" NOT "das Mietvertrag"
- Include exactly 2 English distractors — plausible but clearly wrong translations
- Distractors must match the English style of the correct answer (all with "the" or all without)
- Distractors must not duplicate the correct English translation

Output ONLY valid JSON array, no markdown, no commentary:
[
  {
    "de": "der Vertrag",
    "en": "the contract",
    "level": "${level}",
    "category": "career",
    "topic": "job interview",
    "distractors": ["the application", "the salary"]
  }
]`;
}

function buildUserPrompt(params: GenerateParams): string {
  const topicClause = params.topic ? `, topic ${params.topic}` : "";
  return `Generate ${params.count} NEW German vocabulary entries for CEFR level ${params.level}, category ${params.category}${topicClause}.

Use only words that appear on mainstream ${params.level} Goethe/telc or coursebook vocabulary lists — not invented terms.
Each German entry must be at most ${MAX_VOCAB_WORDS} words. Single words preferred.
Return only the JSON array.${buildExcludeClause(params.excludeDe)}`;
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
  const provider = params.provider ?? "claude";

  try {
    const text = await callAdminLlm(
      provider,
      buildWordSystemPrompt(params.level),
      buildUserPrompt({ ...params, count }),
    );
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
    console.error(`[generate-words] ${provider} call failed:`, e);
    return [];
  }
}
