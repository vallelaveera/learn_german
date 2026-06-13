import type { GenderArticle, GenderNoun } from "./types";

export const GERMAN_NOUNS: GenderNoun[] = [
  { id: "lehrer", emoji: "👨‍🏫", word: "Lehrer", article: "der" },
  { id: "tag", emoji: "📅", word: "Tag", article: "der" },
  { id: "monat", emoji: "🗓️", word: "Monat", article: "der" },
  { id: "sommer", emoji: "☀️", word: "Sommer", article: "der" },
  { id: "computer", emoji: "💻", word: "Computer", article: "der" },
  { id: "tisch", emoji: "🪑", word: "Tisch", article: "der" },
  { id: "hund", emoji: "🐕", word: "Hund", article: "der" },
  { id: "baum", emoji: "🌳", word: "Baum", article: "der" },
  { id: "schmetterling", emoji: "🦋", word: "Schmetterling", article: "der" },
  { id: "optimismus", emoji: "✨", word: "Optimismus", article: "der" },
  { id: "fruhling", emoji: "🌸", word: "Frühling", article: "der" },
  { id: "student", emoji: "🎓", word: "Student", article: "der" },
  { id: "arbeiter", emoji: "👷", word: "Arbeiter", article: "der" },
  { id: "schilling", emoji: "🪙", word: "Schilling", article: "der" },
  { id: "montag", emoji: "📆", word: "Montag", article: "der" },
  { id: "januar", emoji: "🗓️", word: "Januar", article: "der" },
  { id: "winter", emoji: "❄️", word: "Winter", article: "der" },
  { id: "garten", emoji: "🌻", word: "Garten", article: "der" },
  { id: "finger", emoji: "☝️", word: "Finger", article: "der" },
  { id: "freiheit", emoji: "🕊️", word: "Freiheit", article: "die" },
  { id: "freundschaft", emoji: "🤝", word: "Freundschaft", article: "die" },
  { id: "losung", emoji: "💡", word: "Lösung", article: "die" },
  { id: "nation", emoji: "🌍", word: "Nation", article: "die" },
  { id: "wohnung", emoji: "🏠", word: "Wohnung", article: "die" },
  { id: "blume", emoji: "🌷", word: "Blume", article: "die" },
  { id: "katze", emoji: "🐈", word: "Katze", article: "die" },
  { id: "zeit", emoji: "⏰", word: "Zeit", article: "die" },
  { id: "information", emoji: "ℹ️", word: "Information", article: "die" },
  { id: "qualitat", emoji: "⭐", word: "Qualität", article: "die" },
  { id: "wirtschaft", emoji: "📈", word: "Wirtschaft", article: "die" },
  { id: "mannschaft", emoji: "👥", word: "Mannschaft", article: "die" },
  { id: "wahrheit", emoji: "💎", word: "Wahrheit", article: "die" },
  { id: "meinung", emoji: "💬", word: "Meinung", article: "die" },
  { id: "gesundheit", emoji: "🏥", word: "Gesundheit", article: "die" },
  { id: "moglichkeit", emoji: "🎯", word: "Möglichkeit", article: "die" },
  { id: "universitat", emoji: "🏛️", word: "Universität", article: "die" },
  { id: "diskussion", emoji: "🗨️", word: "Diskussion", article: "die" },
  { id: "realitat", emoji: "🌐", word: "Realität", article: "die" },
  { id: "madchen", emoji: "👧", word: "Mädchen", article: "das" },
  { id: "kind", emoji: "🧒", word: "Kind", article: "das" },
  { id: "instrument", emoji: "🎸", word: "Instrument", article: "das" },
  { id: "essen", emoji: "🍽️", word: "Essen", article: "das" },
  { id: "lernen", emoji: "📚", word: "Lernen", article: "das" },
  { id: "gebaude", emoji: "🏢", word: "Gebäude", article: "das" },
  { id: "buch", emoji: "📖", word: "Buch", article: "das" },
  { id: "auto", emoji: "🚗", word: "Auto", article: "das" },
  { id: "dokument", emoji: "📄", word: "Dokument", article: "das" },
  { id: "gefuhl", emoji: "💭", word: "Gefühl", article: "das" },
  { id: "element", emoji: "🧪", word: "Element", article: "das" },
  { id: "haus", emoji: "🏡", word: "Haus", article: "das" },
  { id: "wasser", emoji: "💧", word: "Wasser", article: "das" },
  { id: "gesicht", emoji: "😊", word: "Gesicht", article: "das" },
  { id: "schreiben", emoji: "✍️", word: "Schreiben", article: "das" },
  { id: "fruhstuck", emoji: "🥐", word: "Frühstück", article: "das" },
  { id: "messer", emoji: "🔪", word: "Messer", article: "das" },
  { id: "problem", emoji: "❗", word: "Problem", article: "das" },
  { id: "thema", emoji: "📋", word: "Thema", article: "das" },
  { id: "kino", emoji: "🎬", word: "Kino", article: "das" },
];

export function shuffleNouns<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function pickRandomNouns(count: number, article?: GenderArticle): GenderNoun[] {
  const pool = article ? GERMAN_NOUNS.filter(n => n.article === article) : GERMAN_NOUNS;
  return shuffleNouns(pool).slice(0, Math.min(count, pool.length));
}

export function pickSortRoundWords(): GenderNoun[] {
  return shuffleNouns([
    ...pickRandomNouns(3, "der"),
    ...pickRandomNouns(3, "die"),
    ...pickRandomNouns(3, "das"),
  ]);
}

export function nounsByArticle(article: GenderArticle): GenderNoun[] {
  return GERMAN_NOUNS.filter(n => n.article === article);
}
