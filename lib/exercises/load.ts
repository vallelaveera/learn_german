import placementData from "@/data/flashcards/placement.json";
import commonData from "@/data/flashcards/common.json";
import { getCareerVocabEntries } from "@/lib/career-vocab/load";
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
  const filtered = level
    ? commonDeck.filter(e => !e.level || e.level === level || e.level === "A1")
    : commonDeck;
  return shuffle(filtered).slice(0, limit);
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
