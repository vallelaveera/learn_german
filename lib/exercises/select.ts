import { getVocab } from "@/lib/kv";
import type { UserProfile } from "@/lib/types";
import { getCommonEntries, resolveWordEntry, resolveWordsToEntries } from "./load";
import { toBinaryCards } from "./cards";
import type { BinaryCard } from "./types";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function levelPrefix(level?: string): string {
  if (!level) return "A1";
  if (level.startsWith("A1")) return "A1";
  if (level.startsWith("A2")) return "A2";
  if (level.startsWith("B1")) return "B1";
  if (level.startsWith("B2") || level.startsWith("C")) return "B1";
  return "A2";
}

export async function selectWarmupCards(userId: string, profile: UserProfile, limit = 5): Promise<BinaryCard[]> {
  const vocab = await getVocab(userId);
  const now = Date.now();
  const picked: string[] = [];

  const unpracticed = vocab
    .filter(v => !v.usedByUser && v.timesSeen >= 1)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 3)
    .map(v => v.word);
  picked.push(...unpracticed);

  const shaky = vocab
    .filter(v => v.usedByUser && v.timesSeen <= 2)
    .sort((a, b) => a.timesSeen - b.timesSeen)
    .slice(0, 1)
    .map(v => v.word);
  picked.push(...shaky);

  const review = vocab
    .filter(v => v.timesSeen >= 2 && now - v.lastSeen > SEVEN_DAYS)
    .sort((a, b) => a.lastSeen - b.lastSeen)
    .slice(0, 1)
    .map(v => v.word);
  picked.push(...review);

  const unique = Array.from(new Set(picked.map(w => w.toLowerCase())));
  let entries = resolveWordsToEntries(unique);

  if (entries.length < limit) {
    const fallback = getCommonEntries(levelPrefix(profile.germanLevel), limit * 2);
    for (const entry of fallback) {
      if (entries.length >= limit) break;
      if (!entries.some(e => e.id === entry.id)) entries.push(entry);
    }
  }

  if (!entries.length) {
    entries = getCommonEntries("A1", limit);
  }

  return toBinaryCards(entries.slice(0, limit), "warmup");
}

export function entryFromGerman(german: string): BinaryCard | null {
  const entry = resolveWordEntry(german);
  if (!entry) return null;
  return toBinaryCards([entry])[0];
}
