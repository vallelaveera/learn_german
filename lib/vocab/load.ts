import { Redis } from "@upstash/redis";
import type { SavedSentence, SavedWord } from "./types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function parseSentenceRecord(raw: unknown): SavedSentence | null {
  if (!raw) return null;
  try {
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record?.id || !record?.de || !record?.en) return null;
    return record as SavedSentence;
  } catch {
    return null;
  }
}

function parseWordRecord(raw: unknown): SavedWord | null {
  if (!raw) return null;
  try {
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record?.id || !record?.de || !record?.en || !Array.isArray(record.distractors)) return null;
    return record as SavedWord;
  } catch {
    return null;
  }
}

export async function loadCorpusSentences(): Promise<SavedSentence[]> {
  try {
    const ids = await redis.zrange<string[]>("corpus:sentences:all", 0, -1, { rev: true });
    if (!ids?.length) return [];

    const records = await Promise.all(
      ids.map(id => redis.get<string>(`corpus:sentence:${id}`))
    );

    return records
      .map(parseSentenceRecord)
      .filter((s): s is SavedSentence => s !== null);
  } catch (e) {
    console.error("[vocab/load] failed to load corpus sentences:", e);
    return [];
  }
}

export async function loadCorpusWords(): Promise<SavedWord[]> {
  try {
    const ids = await redis.zrange<string[]>("corpus:words:all", 0, -1, { rev: true });
    if (!ids?.length) return [];

    const records = await Promise.all(
      ids.map(id => redis.get<string>(`corpus:word:${id}`))
    );

    return records
      .map(parseWordRecord)
      .filter((w): w is SavedWord => w !== null);
  } catch (e) {
    console.error("[vocab/load] failed to load corpus words:", e);
    return [];
  }
}
