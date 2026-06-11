import { getVocab, getWarmupMasteredKeys } from "@/lib/kv";
import type { UserProfile } from "@/lib/types";
import { getWarmupPool, resolveWordEntry, resolveWordsToEntries } from "./load";
import { isLevelAppropriate, isTooBasic } from "./levels";
import { toBinaryCards } from "./cards";
import type { BinaryCard, FlashCardEntry } from "./types";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function isMastered(entry: FlashCardEntry, mastered: Set<string>): boolean {
  return mastered.has(entry.id) || mastered.has(entry.german.toLowerCase().trim());
}

export async function selectWarmupCards(userId: string, profile: UserProfile, limit = 5): Promise<BinaryCard[]> {
  const userLevel = profile.germanLevel ?? profile.facts.germanLevel ?? "A2";
  const mastered = await getWarmupMasteredKeys(userId);
  const vocab = await getVocab(userId);
  const now = Date.now();
  const picked: string[] = [];

  const unpracticed = vocab
    .filter(v => !v.usedByUser && v.timesSeen >= 1)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 4)
    .map(v => v.word);
  picked.push(...unpracticed);

  const shaky = vocab
    .filter(v => v.usedByUser && v.timesSeen <= 2)
    .sort((a, b) => a.timesSeen - b.timesSeen)
    .slice(0, 2)
    .map(v => v.word);
  picked.push(...shaky);

  const review = vocab
    .filter(v => v.timesSeen >= 2 && now - v.lastSeen > SEVEN_DAYS)
    .sort((a, b) => a.lastSeen - b.lastSeen)
    .slice(0, 2)
    .map(v => v.word);
  picked.push(...review);

  const unique = Array.from(new Set(picked.map(w => w.toLowerCase())));
  let entries = resolveWordsToEntries(unique).filter(
    e =>
      !isTooBasic(e.german, userLevel) &&
      isLevelAppropriate(e.level, userLevel) &&
      !isMastered(e, mastered)
  );

  if (entries.length < limit) {
    const pool = getWarmupPool(userLevel, limit * 10);
    for (const entry of pool) {
      if (entries.length >= limit) break;
      if (isMastered(entry, mastered)) continue;
      if (!entries.some(e => e.id === entry.id)) entries.push(entry);
    }
  }

  // Pool exhausted — allow repeats only after the 7-day mastery window
  if (entries.length < limit) {
    const fallback = getWarmupPool(userLevel, limit * 4);
    for (const entry of fallback) {
      if (entries.length >= limit) break;
      if (!entries.some(e => e.id === entry.id)) entries.push(entry);
    }
  }

  return toBinaryCards(entries.slice(0, limit), "warmup");
}

export function entryFromGerman(german: string): BinaryCard | null {
  const entry = resolveWordEntry(german);
  if (!entry) return null;
  return toBinaryCards([entry])[0];
}
