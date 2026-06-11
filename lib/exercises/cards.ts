import type { BinaryCard, FlashCardEntry } from "./types";

function pickDistractor(entry: FlashCardEntry): string {
  const pool = entry.distractors.filter(Boolean);
  if (!pool.length) return "Something else";
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickGermanDistractor(entry: FlashCardEntry, pool: FlashCardEntry[]): string {
  const others = pool.filter(e => e.id !== entry.id).map(e => e.german);
  if (others.length) return others[Math.floor(Math.random() * others.length)];
  const words = entry.german.split(/\s+/);
  return words.length > 1 ? words.slice(0, -1).join(" ") : `${entry.german}?`;
}

export function toBinaryCard(entry: FlashCardEntry, pool: FlashCardEntry[], source?: string): BinaryCard {
  const wrongEn = pickDistractor(entry);
  const wrongDe = pickGermanDistractor(entry, pool);
  const enCorrectFirst = Math.random() < 0.5;
  const deCorrectFirst = Math.random() < 0.5;

  return {
    id: entry.id,
    german: entry.german,
    english: entry.english,
    optionA: enCorrectFirst ? entry.english : wrongEn,
    optionB: enCorrectFirst ? wrongEn : entry.english,
    correctOption: enCorrectFirst ? "A" : "B",
    deOptionA: deCorrectFirst ? entry.german : wrongDe,
    deOptionB: deCorrectFirst ? wrongDe : entry.german,
    deCorrectOption: deCorrectFirst ? "A" : "B",
    level: entry.level,
    source,
  };
}

export function toBinaryCards(entries: FlashCardEntry[], source?: string): BinaryCard[] {
  return entries.map(e => toBinaryCard(e, entries, source));
}
