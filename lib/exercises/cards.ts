import type { BinaryCard, FlashCardEntry } from "./types";

function pickDistractor(entry: FlashCardEntry): string {
  const pool = entry.distractors.filter(Boolean);
  if (!pool.length) return "Something else";
  return pool[Math.floor(Math.random() * pool.length)];
}

export function toBinaryCard(entry: FlashCardEntry, source?: string): BinaryCard {
  const wrong = pickDistractor(entry);
  const correctFirst = Math.random() < 0.5;
  return {
    id: entry.id,
    german: entry.german,
    optionA: correctFirst ? entry.english : wrong,
    optionB: correctFirst ? wrong : entry.english,
    correctOption: correctFirst ? "A" : "B",
    level: entry.level,
    source,
  };
}

export function toBinaryCards(entries: FlashCardEntry[], source?: string): BinaryCard[] {
  return entries.map(e => toBinaryCard(e, source));
}
