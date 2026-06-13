import type { GenderPattern } from "./types";

function buildFull(parts: string[], keys: string[]): string {
  let out = "";
  for (let i = 0; i < keys.length; i += 1) {
    out += parts[i] ?? "";
    out += keys[i];
  }
  out += parts[parts.length - 1] ?? "";
  return out;
}

export const GERMAN_PATTERNS: GenderPattern[] = [
  {
    article: "der",
    character: "The King",
    frameParts: [
      "The King, a strong ",
      " and loving ",
      ", full of ",
      ", rules every ",
      ", ",
      " and ",
      ".",
    ],
    keys: ["teacher", "darling", "optimismus", "day", "month", "season"],
    decoys: ["queen", "freedom", "nation", "eating", "learning", "girlchen"],
    hints: [
      "-er = doer",
      "-ling = loved one",
      "-ismus = ideology",
      "day = der",
      "month = der",
      "season = der",
    ],
    rules: [
      { tag: "-er", note: "People & agents (doers)", examples: ["Lehrer", "Arbeiter", "Computer"] },
      { tag: "-ling", note: "Diminutive / loved ones", examples: ["Schmetterling", "Frühling", "Schilling"] },
      { tag: "-ismus", note: "Ideologies & movements", examples: ["Optimismus", "Kapitalismus", "Tourismus"] },
      { tag: "time", note: "Days, months, seasons", examples: ["Montag", "Januar", "Sommer"] },
    ],
  },
  {
    article: "die",
    character: "The Queen",
    frameParts: [
      "The Queen, full of ",
      " and ",
      ", gives every ",
      " and ",
      " to the ",
      ".",
    ],
    keys: ["freiheit", "freundschaft", "solution", "opportunity", "nation"],
    decoys: ["teacher", "darling", "optimismus", "girlchen", "eating", "learning"],
    hints: [
      "-heit = quality",
      "-schaft = group",
      "-ung = always die",
      "-keit = quality",
      "-ion = loanword",
    ],
    rules: [
      { tag: "-heit", note: "Abstract qualities", examples: ["Freiheit", "Wahrheit", "Gesundheit"] },
      { tag: "-schaft", note: "Groups & collectives", examples: ["Freundschaft", "Mannschaft", "Wirtschaft"] },
      { tag: "-ung", note: "Almost always feminine", examples: ["Lösung", "Wohnung", "Meinung"] },
      { tag: "-ion/-tät", note: "Loanwords & abstractions", examples: ["Nation", "Information", "Qualität"] },
    ],
  },
  {
    article: "das",
    character: "The little one",
    frameParts: [
      "The little ",
      " loves ",
      ", collects ",
      ", and enjoys ",
      " and ",
      ".",
    ],
    keys: ["girlchen", "gestures", "instruments", "eating", "learning"],
    decoys: ["teacher", "freiheit", "nation", "darling", "optimismus", "freundschaft"],
    hints: [
      "-chen = neuter",
      "Ge- = neuter",
      "-ment = neuter",
      "verb-noun = das",
      "verb-noun = das",
    ],
    rules: [
      { tag: "-chen/-lein", note: "Diminutives are neuter", examples: ["Mädchen", "Häuschen", "Fräulein"] },
      { tag: "Ge-", note: "Collective prefix", examples: ["Gebäude", "Gesicht", "Gefühl"] },
      { tag: "-ment", note: "Latin loanwords", examples: ["Instrument", "Dokument", "Element"] },
      { tag: "verb → noun", note: "Gerunds / nominalized verbs", examples: ["Essen", "Lernen", "Schreiben"] },
    ],
  },
];

export function getPatternForRound(roundNum: number): GenderPattern {
  const idx = ((roundNum - 1) % GERMAN_PATTERNS.length + GERMAN_PATTERNS.length) % GERMAN_PATTERNS.length;
  return GERMAN_PATTERNS[idx]!;
}

export function patternFullSentence(pattern: GenderPattern): string {
  return buildFull(pattern.frameParts, pattern.keys);
}

export function practiceWordPool(pattern: GenderPattern): string[] {
  const all = [...pattern.keys, ...pattern.decoys];
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}
