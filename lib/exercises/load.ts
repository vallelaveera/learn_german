import placementData from "@/data/flashcards/placement.json";
import commonData from "@/data/flashcards/common.json";
import { getCareerVocabEntries } from "@/lib/career-vocab/load";
import { isLevelAppropriate, isTooBasic, levelRank, normalizeLevel } from "./levels";
import type { FlashCardEntry } from "./types";

type PlacementDeck = Record<string, FlashCardEntry[]>;

const placementDeck = placementData as PlacementDeck;
const commonDeck = commonData as FlashCardEntry[];

let lookupCache: Map<string, FlashCardEntry> | null = null;

function buildLookup(): Map<string, FlashCardEntry> {
  if (lookupCache) return lookupCache;
  const map = new Map<string, FlashCardEntry>();
  for (const level of Object.keys(placementDeck)) {
    for (const entry of placementDeck[level]) {
      map.set(entry.german.toLowerCase(), { ...entry, level });
      map.set(entry.id, { ...entry, level });
    }
  }
  for (const entry of commonDeck) {
    map.set(entry.german.toLowerCase(), entry);
    map.set(entry.id, entry);
  }
  for (const entry of getCareerVocabEntries()) {
    const text = entry.text;
    if (!map.has(text.toLowerCase())) {
      map.set(text.toLowerCase(), {
        id: entry.id,
        german: text,
        english: entry.english,
        distractors: pickCareerDistractors(entry.english, entry.level),
        level: entry.level,
      });
    }
  }
  lookupCache = map;
  return map;
}

function pickCareerDistractors(english: string, level: string): string[] {
  const pool = getCareerVocabEntries()
    .filter(e => e.english !== english && (e.level === level || e.level === "B1"))
    .map(e => e.english)
    .slice(0, 20);
  return shuffle(pool).slice(0, 2);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getPlacementEntries(level: "A1" | "A2" | "B1"): FlashCardEntry[] {
  return (placementDeck[level] ?? []).map(e => ({ ...e, level }));
}

export function getCommonEntries(level?: string, limit = 12): FlashCardEntry[] {
  const userLevel = normalizeLevel(level);
  const filtered = commonDeck.filter(
    e => isLevelAppropriate(e.level, userLevel) && !isTooBasic(e.german, userLevel)
  );
  return shuffle(filtered).slice(0, limit);
}

/** Level-matched pool for pre-call warm-up — no A1 greetings for A2+ users. */
export function getWarmupPool(userLevel: string | undefined, limit: number): FlashCardEntry[] {
  const normalized = normalizeLevel(userLevel);
  const rank = levelRank(normalized);
  const deckLevels: Array<"A1" | "A2" | "B1"> =
    rank >= 3 ? ["B1", "A2"] : rank >= 2 ? ["A2", "B1"] : ["A1", "A2"];

  const pool: FlashCardEntry[] = [];
  const seen = new Set<string>();

  const add = (entry: FlashCardEntry) => {
    if (seen.has(entry.id) || isTooBasic(entry.german, normalized)) return;
    if (!isLevelAppropriate(entry.level, normalized)) return;
    seen.add(entry.id);
    pool.push(entry);
  };

  for (const lv of deckLevels) {
    for (const entry of getPlacementEntries(lv)) add(entry);
  }
  for (const entry of commonDeck) add(entry);

  const career = shuffle(
    getCareerVocabEntries().filter(e => {
      const r = levelRank(e.level);
      return r >= rank && r <= rank + 1 && e.text.length <= 35 && !e.text.includes("/");
    })
  ).slice(0, 24);

  for (const entry of career) {
    add({
      id: entry.id,
      german: entry.text,
      english: entry.english,
      distractors: pickCareerDistractors(entry.english, entry.level),
      level: entry.level,
    });
  }

  return shuffle(pool).slice(0, limit);
}

export function resolveWordEntry(word: string): FlashCardEntry | null {
  const map = buildLookup();
  const key = word.trim().toLowerCase();
  return map.get(key) ?? null;
}

export function resolveWordsToEntries(words: string[]): FlashCardEntry[] {
  const seen = new Set<string>();
  const out: FlashCardEntry[] = [];
  for (const word of words) {
    const entry = resolveWordEntry(word);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}
