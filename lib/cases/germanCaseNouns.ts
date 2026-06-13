import type { CaseNoun } from "./types";

function n(
  id: string,
  word: string,
  gender: CaseNoun["gender"],
  plural: string,
  en: string,
  emoji: string,
  level: CaseNoun["level"],
  extra?: Partial<CaseNoun>,
): CaseNoun {
  const gen =
    gender === "f"
      ? word
      : `${word}${word.endsWith("s") || word.endsWith("ß") || word.endsWith("x") || word.endsWith("z") ? "" : "es"}`;
  return {
    id,
    word,
    gender,
    plural,
    en,
    emoji,
    level,
    genitiveSg: gen,
    dativePl: plural.endsWith("n") ? plural : `${plural}n`,
    ...extra,
  };
}

export const CASE_NOUNS: CaseNoun[] = [
  n("hund", "Hund", "m", "Hunde", "dog", "🐕", "B1"),
  n("mann", "Mann", "m", "Männer", "man", "👨", "B1"),
  n("vater", "Vater", "m", "Väter", "father", "👨‍👧", "B1"),
  n("tisch", "Tisch", "m", "Tische", "table", "🪑", "B1"),
  n("tag", "Tag", "m", "Tage", "day", "📅", "B1"),
  n("film", "Film", "m", "Filme", "film", "🎬", "B1"),
  n("brief", "Brief", "m", "Briefe", "letter", "✉️", "B1"),
  n("freund", "Freund", "m", "Freunde", "friend", "🤝", "B1"),
  n("katze", "Katze", "f", "Katzen", "cat", "🐈", "B1"),
  n("frau", "Frau", "f", "Frauen", "woman", "👩", "B1"),
  n("mutter", "Mutter", "f", "Mütter", "mother", "👩‍👧", "B1"),
  n("blume", "Blume", "f", "Blumen", "flower", "🌷", "B1"),
  n("stadt", "Stadt", "f", "Städte", "city", "🏙️", "B1"),
  n("zeit", "Zeit", "f", "Zeiten", "time", "⏰", "B1"),
  n("frage", "Frage", "f", "Fragen", "question", "❓", "B1"),
  n("kind", "Kind", "n", "Kinder", "child", "🧒", "B1"),
  n("buch", "Buch", "n", "Bücher", "book", "📖", "B1"),
  n("haus", "Haus", "n", "Häuser", "house", "🏡", "B1"),
  n("auto", "Auto", "n", "Autos", "car", "🚗", "B1"),
  n("essen", "Essen", "n", "—", "food", "🍽️", "B1"),
  n("geschenk", "Geschenk", "n", "Geschenke", "gift", "🎁", "B1"),
  n("student", "Student", "m", "Studenten", "student", "🎓", "B2", { nDecl: true }),
  n("junge", "Junge", "m", "Jungen", "boy", "👦", "B2", { nDecl: true }),
  n("herr", "Herr", "m", "Herren", "Mr.", "🎩", "B2", { nDecl: true }),
  n("name", "Name", "m", "Namen", "name", "🏷️", "B2", { nDecl: true }),
  n("mensch", "Mensch", "m", "Menschen", "person", "🧑", "B2", { nDecl: true }),
  n("kollege", "Kollege", "m", "Kollegen", "colleague", "👔", "B2", { nDecl: true }),
  n("kunde", "Kunde", "m", "Kunden", "customer", "🛒", "B2", { nDecl: true }),
  n("nachbar", "Nachbar", "m", "Nachbarn", "neighbor", "🏘️", "B2", { nDecl: true }),
  n("praesident", "Präsident", "m", "Präsidenten", "president", "🏛️", "B2", { nDecl: true }),
  n("polizist", "Polizist", "m", "Polizisten", "police officer", "👮", "B2", { nDecl: true }),
  n("beamter", "Beamter", "m", "Beamte", "civil servant", "📋", "C1", { adjNoun: true }),
  n("deutsche", "Deutsche", "f", "Deutschen", "German (person)", "🇩🇪", "C1", { adjNoun: true }),
  n("bus", "Bus", "m", "Busse", "bus", "🚌", "B1"),
  n("kurs", "Kurs", "m", "Kurse", "course", "📚", "B1"),
  n("schule", "Schule", "f", "Schulen", "school", "🏫", "B1"),
  n("park", "Park", "m", "Parks", "park", "🌳", "B1"),
  n("wagen", "Wagen", "m", "Wagen", "car/wagon", "🚙", "B1"),
  n("sohn", "Sohn", "m", "Söhne", "son", "👦", "B1"),
  n("tochter", "Tochter", "f", "Töchter", "daughter", "👧", "B1"),
];

export function nounsForLevel(level: CaseNoun["level"], selected: CaseNoun["level"]): CaseNoun[] {
  const order = ["B1", "B2", "C1", "C2"];
  return CASE_NOUNS.filter(
    n => order.indexOf(n.level) <= order.indexOf(selected),
  );
}

export function pickNouns(count: number, selected: CaseNoun["level"]): CaseNoun[] {
  const pool = nounsForLevel(selected, selected);
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
