import { Redis } from "@upstash/redis";
import type { CEFRLevel, SavedSentence, SavedWord, UnifiedWord } from "./types";

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

export async function listCorpusGermanByCategoryLevel(
  category: string,
  level: CEFRLevel,
  kind: "words" | "sentences"
): Promise<string[]> {
  const entries = kind === "words" ? await loadCorpusWords() : await loadCorpusSentences();
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.category !== category || entry.level !== level) continue;
    const de = entry.de.trim();
    if (!de || seen.has(de)) continue;
    seen.add(de);
    result.push(de);
  }
  return result;
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

function parseUnifiedWordRecord(raw: unknown): UnifiedWord | null {
  if (!raw) return null;
  try {
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record?.id || !record?.text || !record?.translation) return null;
    return record as UnifiedWord;
  } catch {
    return null;
  }
}

export async function loadUnifiedWords(): Promise<UnifiedWord[]> {
  try {
    const ids = await redis.zrange<string[]>("uv:words:all", 0, -1, { rev: true });
    if (!ids?.length) return [];

    const records = await Promise.all(
      ids.map(id => redis.get<string>(`uv:word:${id}`)),
    );

    return records
      .map(parseUnifiedWordRecord)
      .filter((w): w is UnifiedWord => w !== null);
  } catch (e) {
    console.error("[vocab/load] failed to load unified words:", e);
    return [];
  }
}

export async function filterUnifiedWords(params: {
  level?: CEFRLevel;
  category?: string;
}): Promise<UnifiedWord[]> {
  let words = await loadUnifiedWords();
  if (params.level) {
    words = words.filter(w => w.level === params.level);
  }
  if (params.category) {
    words = words.filter(w => w.category === params.category);
  }
  return words;
}
