import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import type {
  ImportWordInput,
  SavedSentence,
  SavedWord,
  SentenceInput,
  UnifiedWord,
  WordInput,
} from "./types";
import { getOrGenerateIcon } from "./icons";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function dedupKey(text: string): string {
  return text.toLowerCase().trim();
}

function isImportWordInput(word: WordInput | ImportWordInput): word is ImportWordInput {
  return "text" in word && "translation" in word;
}

function parseUnifiedWord(raw: unknown): UnifiedWord | null {
  if (!raw) return null;
  try {
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record?.id || !record?.text || !record?.translation) return null;
    return record as UnifiedWord;
  } catch {
    return null;
  }
}

async function saveImportWord(word: ImportWordInput, now: number): Promise<string | null> {
  const textKey = dedupKey(word.text);
  const existingId = await redis.get<string>(`uv:wk:${textKey}`);

  if (existingId) {
    const raw = await redis.get<string>(`uv:word:${existingId}`);
    const existing = parseUnifiedWord(raw);
    if (existing) {
      const updated: UnifiedWord = {
        ...existing,
        seenCount: existing.seenCount + 1,
        lastSeenAt: now,
      };
      await redis.set(`uv:word:${existingId}`, JSON.stringify(updated));
    }
    return null;
  }

  const id = word.id ?? uuidv4();
  const record: UnifiedWord = {
    id,
    text: word.text,
    translation: word.translation,
    level: word.level,
    category: word.category,
    seenCount: 1,
    firstSeenAt: now,
    lastSeenAt: now,
    correctCount: 0,
    article: word.article,
    base: word.base,
    plural: word.plural,
    example: word.example,
    priority: word.priority,
    type: word.type,
  };

  await redis.set(`uv:word:${id}`, JSON.stringify(record));
  await redis.set(`uv:wk:${textKey}`, id);
  await redis.zadd("uv:words:all", { score: now, member: id });

  void getOrGenerateIcon(word.text, word.translation).catch(err =>
    console.error("Icon gen failed:", err),
  );

  return id;
}

export async function saveSentences(sentences: SentenceInput[]): Promise<string[]> {
  if (sentences.length === 0) return [];

  const savedIds: string[] = [];
  const now = Date.now();

  for (const sentence of sentences) {
    const key = dedupKey(sentence.de);
    const existingId = await redis.get<string>(`corpus:sentence:dedup:${key}`);
    if (existingId) continue;

    const id = uuidv4();
    const record: SavedSentence = {
      id,
      de: sentence.de,
      en: sentence.en,
      level: sentence.level,
      category: sentence.category,
      topic: sentence.topic,
      type: sentence.type,
      source: "generated",
      createdAt: now,
    };

    await redis.set(`corpus:sentence:${id}`, JSON.stringify(record));
    await redis.set(`corpus:sentence:dedup:${key}`, id);
    await redis.zadd("corpus:sentences:all", { score: now, member: id });
    savedIds.push(id);
  }

  return savedIds;
}

export async function saveWords(words: (WordInput | ImportWordInput)[]): Promise<string[]> {
  if (words.length === 0) return [];

  const savedIds: string[] = [];
  const now = Date.now();

  for (const word of words) {
    if (isImportWordInput(word)) {
      const id = await saveImportWord(word, now);
      if (id) savedIds.push(id);
      continue;
    }

    const key = dedupKey(word.de);
    const existingId = await redis.get<string>(`corpus:word:dedup:${key}`);
    if (existingId) continue;

    const id = uuidv4();
    const record: SavedWord = {
      id,
      de: word.de,
      en: word.en,
      level: word.level,
      category: word.category,
      topic: word.topic,
      distractors: word.distractors,
      source: "generated",
      createdAt: now,
    };

    await redis.set(`corpus:word:${id}`, JSON.stringify(record));
    await redis.set(`corpus:word:dedup:${key}`, id);
    await redis.zadd("corpus:words:all", { score: now, member: id });
    savedIds.push(id);

    void getOrGenerateIcon(word.de, word.en).catch(err =>
      console.error("Icon gen failed:", err),
    );
  }

  return savedIds;
}

export async function getUnifiedWordById(id: string): Promise<UnifiedWord | null> {
  const raw = await redis.get<string>(`uv:word:${id}`);
  return parseUnifiedWord(raw);
}
