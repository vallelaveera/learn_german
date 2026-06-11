import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import type { SavedSentence, SentenceInput } from "./types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function dedupKey(de: string): string {
  return de.toLowerCase().trim();
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
