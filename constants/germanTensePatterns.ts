import type { PartizipType, TenseId, TenseLevel } from "@/lib/tenses/types";

export interface PartizipRule {
  id: PartizipType;
  label: string;
  formula: string;
  hint: string;
  examples: string[];
}

export interface TensePatternInfo {
  id: TenseId;
  label: string;
  formula: string;
  whenToUse: string;
  level: TenseLevel;
  examples: { de: string; en: string }[];
}

/** Workshop validation targets from the acceptance spec. */
export const WORKSHOP_PARTICIPIA: {
  infinitive: string;
  expected: string;
  partType: PartizipType;
  separablePrefix?: string;
}[] = [
  { infinitive: "machen", expected: "gemacht", partType: "weak" },
  { infinitive: "sprechen", expected: "gesprochen", partType: "strong" },
  { infinitive: "bringen", expected: "gebracht", partType: "mixed" },
  { infinitive: "ankommen", expected: "angekommen", partType: "separable", separablePrefix: "an" },
  { infinitive: "besuchen", expected: "besucht", partType: "inseparable" },
  { infinitive: "studieren", expected: "studiert", partType: "ieren" },
];

export const PARTIZIP_RULES: PartizipRule[] = [
  {
    id: "weak",
    label: "Weak (regular)",
    formula: "ge + stem + t",
    hint: "Most -en verbs: gemacht, gelernt, gekauft",
    examples: ["machen → gemacht", "lernen → gelernt"],
  },
  {
    id: "strong",
    label: "Strong (irregular)",
    formula: "ge + stem + en",
    hint: "Vowel change in stem: sprechen → gesprochen",
    examples: ["sprechen → gesprochen", "gehen → gegangen"],
  },
  {
    id: "mixed",
    label: "Mixed",
    formula: "ge + changed stem + t",
    hint: "Stem change + -t: bringen → gebracht",
    examples: ["bringen → gebracht", "denken → gedacht"],
  },
  {
    id: "separable",
    label: "Separable prefix",
    formula: "prefix + ge + stem + …",
    hint: "ge- sits after the prefix: ankommen → angekommen",
    examples: ["ankommen → angekommen", "aufstehen → aufgestanden"],
  },
  {
    id: "inseparable",
    label: "Inseparable prefix",
    formula: "be/ge/er/ver/zer/ent/emp/miss — no ge-",
    hint: "Prefix blocks ge-: besuchen → besucht",
    examples: ["besuchen → besucht", "verstehen → verstanden"],
  },
  {
    id: "ieren",
    label: "-ieren verbs",
    formula: "stem + t (no ge-)",
    hint: "Latin loans: studieren → studiert",
    examples: ["studieren → studiert", "telefonieren → telefoniert"],
  },
];

/** Motion / change-of-state → sein; default → haben. */
export const SEIN_VERBS = new Set([
  "gehen",
  "kommen",
  "fahren",
  "fliegen",
  "schwimmen",
  "laufen",
  "reisen",
  "ankommen",
  "abfahren",
  "aufstehen",
  "bleiben",
  "sein",
  "werden",
  "passieren",
  "geschehen",
  "sterben",
  "wachsen",
]);

export const SEIN_ALWAYS = new Set(["sein", "bleiben", "passieren", "geschehen", "werden"]);

export function expectedAux(infinitive: string): "haben" | "sein" {
  if (SEIN_ALWAYS.has(infinitive)) return "sein";
  return SEIN_VERBS.has(infinitive) ? "sein" : "haben";
}

export const AUX_SORT_ITEMS: { infinitive: string; emoji: string; en: string }[] = [
  { infinitive: "gehen", emoji: "🚶", en: "to go" },
  { infinitive: "kommen", emoji: "📍", en: "to come" },
  { infinitive: "fahren", emoji: "🚗", en: "to drive" },
  { infinitive: "bleiben", emoji: "⏸️", en: "to stay" },
  { infinitive: "werden", emoji: "✨", en: "to become" },
  { infinitive: "passieren", emoji: "💥", en: "to happen" },
  { infinitive: "machen", emoji: "🔨", en: "to do" },
  { infinitive: "sprechen", emoji: "🗣️", en: "to speak" },
  { infinitive: "lernen", emoji: "📚", en: "to learn" },
  { infinitive: "kaufen", emoji: "🛒", en: "to buy" },
  { infinitive: "besuchen", emoji: "🏠", en: "to visit" },
  { infinitive: "schreiben", emoji: "✍️", en: "to write" },
];

export const TENSE_PATTERN_INFO: TensePatternInfo[] = [
  {
    id: "praes",
    label: "Präsens",
    formula: "Subjekt + konjugiertes Verb (+ Objekt)",
    whenToUse: "Now, habits, general truths.",
    level: "B1",
    examples: [
      { de: "Ich spreche Deutsch.", en: "I speak German." },
      { de: "Du gehst nach Hause.", en: "You go home." },
    ],
  },
  {
    id: "perf",
    label: "Perfekt",
    formula: "Subjekt + haben/sein + … + Partizip II",
    whenToUse: "Spoken past — most common in conversation.",
    level: "B1",
    examples: [
      { de: "Ich bin gegangen.", en: "I have gone." },
      { de: "Sie hat das gemacht.", en: "She has done it." },
    ],
  },
  {
    id: "praeter",
    label: "Präteritum",
    formula: "Subjekt + Präteritumform (+ Objekt)",
    whenToUse: "Written narrative, sein/haben/modals in speech.",
    level: "B1",
    examples: [
      { de: "Er ging nach Hause.", en: "He went home." },
      { de: "Wir machten das.", en: "We did that." },
    ],
  },
  {
    id: "fut1",
    label: "Futur I",
    formula: "Subjekt + werden + … + Infinitiv",
    whenToUse: "Future plans and predictions.",
    level: "B1",
    examples: [
      { de: "Ich werde morgen kommen.", en: "I will come tomorrow." },
      { de: "Sie werden Deutsch lernen.", en: "They will learn German." },
    ],
  },
  {
    id: "plusqu",
    label: "Plusquamperfekt",
    formula: "Subjekt + hatte/war + … + Partizip II",
    whenToUse: "Past before another past event.",
    level: "B2",
    examples: [
      { de: "Ihr wart schon gegangen.", en: "You had already left." },
      { de: "Er hatte das gemacht.", en: "He had done it." },
    ],
  },
  {
    id: "fut2",
    label: "Futur II",
    formula: "Subjekt + werden + … + Partizip II + haben/sein",
    whenToUse: "Future perfect; at C2 also past probability.",
    level: "B2",
    examples: [
      { de: "Sie werden das gemacht haben.", en: "They will have done it." },
      { de: "Bis morgen werde ich gegangen sein.", en: "By tomorrow I will have left." },
    ],
  },
  {
    id: "konj2",
    label: "Konjunktiv II",
    formula: "würde + Inf · hätte/wäre + Partizip II",
    whenToUse: "Hypotheticals, polite requests, unreal conditions.",
    level: "B2",
    examples: [
      { de: "Ich würde gern kommen.", en: "I would like to come." },
      { de: "Wenn ich Zeit hätte, würde ich gehen.", en: "If I had time, I would go." },
    ],
  },
  {
    id: "passiv",
    label: "Passiv",
    formula: "Subjekt + werden/wurde + … + Partizip II (+ worden/sein)",
    whenToUse: "Focus on action, not agent. B2: werden-Passiv; C1: all tenses.",
    level: "B2",
    examples: [
      { de: "Das Haus wird gebaut.", en: "The house is being built." },
      { de: "Der Brief wurde geschickt.", en: "The letter was sent." },
    ],
  },
  {
    id: "konj1",
    label: "Konjunktiv I",
    formula: "Indicative stem + Konjunktiv endings (reported speech)",
    whenToUse: "Indirect speech in news and formal reports.",
    level: "C1",
    examples: [
      { de: "Er sagt, er sei krank.", en: "He says he is ill." },
      { de: "Sie meinte, sie habe keine Zeit.", en: "She said she had no time." },
    ],
  },
  {
    id: "doubleInf",
    label: "Double infinitive",
    formula: "… + Partizip II + Modal/Infinitiv (kommen, gehen, lassen …)",
    whenToUse: "Modals + motion verbs at clause end: hat kommen müssen.",
    level: "C1",
    examples: [
      { de: "Er hat kommen müssen.", en: "He had to come." },
      { de: "Sie hat das machen lassen.", en: "She had that done." },
    ],
  },
];

export function patternsForLevel(level: TenseLevel): TensePatternInfo[] {
  const order: TenseLevel[] = ["B1", "B2", "C1", "C2"];
  return TENSE_PATTERN_INFO.filter(p => order.indexOf(p.level) <= order.indexOf(level));
}

export function buildPartizip(
  infinitive: string,
  partType: PartizipType,
  stem: string,
  pp: string,
  separablePrefix?: string,
): string {
  switch (partType) {
    case "weak":
      return `ge${stem}t`;
    case "strong":
      return pp;
    case "mixed":
      return pp;
    case "separable":
      return separablePrefix ? `${separablePrefix}${pp.replace(/^ge/, "ge")}` : pp;
    case "inseparable":
      return pp;
    case "ieren":
      return `${stem}t`;
    default:
      return pp;
  }
}

export function validatePartizipGuess(infinitive: string, guess: string): boolean {
  const target = WORKSHOP_PARTICIPIA.find(w => w.infinitive === infinitive);
  if (!target) return false;
  return guess.trim().toLowerCase() === target.expected.toLowerCase();
}
