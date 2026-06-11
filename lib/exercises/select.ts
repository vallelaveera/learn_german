import { getVocab, getExerciseExcludedKeys } from "@/lib/kv";
import type { UserProfile } from "@/lib/types";
import { getWarmupPoolAsync, preloadCorpusWords, resolveWordEntry, resolveWordsToEntries } from "./load";
import { isLevelAppropriate, isTooBasic } from "./levels";
import { toBinaryCards } from "./cards";
import { isExerciseEntryExcluded } from "./exclusion";
import type { BinaryCard, FlashCardEntry } from "./types";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function isExcluded(entry: FlashCardEntry, excluded: Set<string>): boolean {
  return isExerciseEntryExcluded(entry.id, entry.german, excluded);
}

export async function selectWarmupCards(userId: string, profile: UserProfile, limit = 5): Promise<BinaryCard[]> {
  await preloadCorpusWords();
  const userLevel = profile.germanLevel ?? profile.facts.germanLevel ?? "A2";
  const excluded = await getExerciseExcludedKeys(userId, "warmup");
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
      !isExcluded(e, excluded)
  );

  if (entries.length < limit) {
    const pool = await getWarmupPoolAsync(userLevel, limit * 12);
    for (const entry of pool) {
      if (entries.length >= limit) break;
      if (isExcluded(entry, excluded)) continue;
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
