/** German tense data — timeline tables, 40+ verbs, parts() & bracket helpers. */

import type { PartizipType, SubjectId, TenseId, TenseLevel } from "@/lib/tenses/types";
import { levelIncludes } from "@/lib/tenses/types";
import { TENSE_ACCENT } from "@/lib/tenses/theme";

export type { SubjectId, TenseId, TenseLevel };
export type VerbId = string;
export type TokenState = "past" | "present" | "future" | "futdone";
export type BuildTenseId = "praes" | "perf" | "praeter" | "fut1" | "plusqu" | "fut2";

export interface SubjectDef {
  id: SubjectId;
  label: string;
  start: string;
}

export interface SentencePart {
  text: string;
  highlight: boolean;
}

export interface TenseDef {
  id: BuildTenseId;
  label: string;
  short: string;
  pos: number;
  flagPos?: number;
  tokenState: TokenState;
  color: string;
  showThread?: boolean;
  minLevel: TenseLevel;
}

export interface VerbDef {
  id: VerbId;
  infinitive: string;
  stem: string;
  emoji: string;
  usesSein: boolean;
  object: string;
  pres: readonly string[];
  pret: readonly string[];
  pp: string;
  partType: PartizipType;
  separablePrefix?: string;
  minLevel: TenseLevel;
}

export interface BracketParts {
  v2: string;
  middle: string;
  end: string;
  hasBracket: boolean;
  segments: SentencePart[];
  full: string;
}

export const TOKEN = 44;
export const ROAD_H = 56;
export const GLIDE_MS = 600;
export const JETZT_POS = 50;

export const SUBJECTS: SubjectDef[] = [
  { id: "ich", label: "ich", start: "Ich" },
  { id: "du", label: "du", start: "Du" },
  { id: "er", label: "er", start: "Er" },
  { id: "sie3", label: "sie", start: "Sie" },
  { id: "es", label: "es", start: "Es" },
  { id: "wir", label: "wir", start: "Wir" },
  { id: "ihr", label: "ihr", start: "Ihr" },
  { id: "siePl", label: "sie", start: "Sie" },
  { id: "Sie", label: "Sie", start: "Sie" },
];

export const HABEN_PRES = [
  "habe", "hast", "hat", "hat", "hat", "haben", "habt", "haben", "haben",
] as const;
export const HABEN_PRET = [
  "hatte", "hattest", "hatte", "hatte", "hatte", "hatten", "hattet", "hatten", "hatten",
] as const;
export const SEIN_PRES = ["bin", "bist", "ist", "ist", "ist", "sind", "seid", "sind", "sind"] as const;
export const SEIN_PRET = ["war", "warst", "war", "war", "war", "waren", "wart", "waren", "waren"] as const;
export const WERDEN_PRES = [
  "werde", "wirst", "wird", "wird", "wird", "werden", "werdet", "werden", "werden",
] as const;

function w(stem: string): readonly string[] {
  return [`${stem}e`, `${stem}st`, `${stem}t`, `${stem}t`, `${stem}t`, `${stem}en`, `${stem}t`, `${stem}en`, `${stem}en`];
}
function wt(stem: string): readonly string[] {
  return [`${stem}te`, `${stem}test`, `${stem}te`, `${stem}te`, `${stem}te`, `${stem}ten`, `${stem}tet`, `${stem}ten`, `${stem}ten`];
}

function weak(id: string, inf: string, stem: string, emoji: string, object: string, minLevel: TenseLevel, usesSein = false): VerbDef {
  return {
    id,
    infinitive: inf,
    stem,
    emoji,
    usesSein,
    object,
    pres: w(stem),
    pret: wt(stem),
    pp: `ge${stem}t`,
    partType: "weak",
    minLevel,
  };
}

const VERB_LIST: VerbDef[] = [
  {
    id: "machen",
    infinitive: "machen",
    stem: "mach",
    emoji: "🔨",
    usesSein: false,
    object: "das",
    pres: w("mach"),
    pret: wt("mach"),
    pp: "gemacht",
    partType: "weak",
    minLevel: "B1",
  },
  {
    id: "gehen",
    infinitive: "gehen",
    stem: "geh",
    emoji: "🚶",
    usesSein: true,
    object: "",
    pres: ["gehe", "gehst", "geht", "geht", "geht", "gehen", "geht", "gehen", "gehen"],
    pret: ["ging", "gingst", "ging", "ging", "ging", "gingen", "gingt", "gingen", "gingen"],
    pp: "gegangen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "sprechen",
    infinitive: "sprechen",
    stem: "sprech",
    emoji: "🗣️",
    usesSein: false,
    object: "Deutsch",
    pres: ["spreche", "sprichst", "spricht", "spricht", "spricht", "sprechen", "sprecht", "sprechen", "sprechen"],
    pret: ["sprach", "sprachst", "sprach", "sprach", "sprach", "sprachen", "spracht", "sprachen", "sprachen"],
    pp: "gesprochen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "kommen",
    infinitive: "kommen",
    stem: "komm",
    emoji: "📍",
    usesSein: true,
    object: "",
    pres: w("komm"),
    pret: ["kam", "kamst", "kam", "kam", "kam", "kamen", "kamt", "kamen", "kamen"],
    pp: "gekommen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "fahren",
    infinitive: "fahren",
    stem: "fahr",
    emoji: "🚗",
    usesSein: true,
    object: "dorthin",
    pres: ["fahre", "fährst", "fährt", "fährt", "fährt", "fahren", "fahrt", "fahren", "fahren"],
    pret: ["fuhr", "fuhrst", "fuhr", "fuhr", "fuhr", "fuhren", "fuhrt", "fuhren", "fuhren"],
    pp: "gefahren",
    partType: "strong",
    minLevel: "B1",
  },
  weak("bleiben", "bleiben", "bleib", "⏸️", "hier", "B1", true),
  weak("passieren", "passieren", "passier", "💥", "", "B1", true),
  {
    id: "geschehen",
    infinitive: "geschehen",
    stem: "gescheh",
    emoji: "⚡",
    usesSein: true,
    object: "",
    pres: ["geschehe", "geschehst", "gescheht", "gescheht", "gescheht", "geschehen", "gescheht", "geschehen", "geschehen"],
    pret: ["geschah", "geschahst", "geschah", "geschah", "geschah", "geschah", "geschah", "geschah", "geschah"],
    pp: "geschehen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "werden",
    infinitive: "werden",
    stem: "werd",
    emoji: "✨",
    usesSein: true,
    object: "müde",
    pres: ["werde", "wirst", "wird", "wird", "wird", "werden", "werdet", "werden", "werden"],
    pret: ["wurde", "wurdest", "wurde", "wurde", "wurde", "wurden", "wurdet", "wurden", "wurden"],
    pp: "geworden",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "bringen",
    infinitive: "bringen",
    stem: "bring",
    emoji: "📦",
    usesSein: false,
    object: "das",
    pres: w("bring"),
    pret: wt("bring"),
    pp: "gebracht",
    partType: "mixed",
    minLevel: "B1",
  },
  {
    id: "besuchen",
    infinitive: "besuchen",
    stem: "besuch",
    emoji: "🏠",
    usesSein: false,
    object: "Berlin",
    pres: w("besuch"),
    pret: wt("besuch"),
    pp: "besucht",
    partType: "inseparable",
    minLevel: "B1",
  },
  {
    id: "studieren",
    infinitive: "studieren",
    stem: "studier",
    emoji: "🎓",
    usesSein: false,
    object: "Medizin",
    pres: w("studier"),
    pret: wt("studier"),
    pp: "studiert",
    partType: "ieren",
    minLevel: "B1",
  },
  {
    id: "ankommen",
    infinitive: "ankommen",
    stem: "komm",
    emoji: "🛬",
    usesSein: true,
    object: "",
    pres: ["komme an", "kommst an", "kommt an", "kommt an", "kommt an", "kommen an", "kommt an", "kommen an", "kommen an"],
    pret: ["kam an", "kamst an", "kam an", "kam an", "kam an", "kamen an", "kamt an", "kamen an", "kamen an"],
    pp: "angekommen",
    partType: "separable",
    separablePrefix: "an",
    minLevel: "B1",
  },
  weak("kaufen", "kaufen", "kauf", "🛒", "Brot", "B1"),
  weak("lernen", "lernen", "lern", "📚", "Deutsch", "B1"),
  weak("arbeiten", "arbeiten", "arbeit", "💼", "viel", "B1"),
  weak("wohnen", "wohnen", "wohn", "🏡", "in Berlin", "B1"),
  weak("spielen", "spielen", "spiel", "⚽", "Fußball", "B1"),
  weak("hören", "hören", "hör", "👂", "Musik", "B1"),
  weak("sagen", "sagen", "sag", "💬", "die Wahrheit", "B1"),
  weak("fragen", "fragen", "frag", "❓", "nach dem Weg", "B1"),
  weak("antworten", "antworten", "antwort", "📩", "sofort", "B1"),
  {
    id: "essen",
    infinitive: "essen",
    stem: "ess",
    emoji: "🍽️",
    usesSein: false,
    object: "Pizza",
    pres: ["esse", "isst", "isst", "isst", "isst", "essen", "esst", "essen", "essen"],
    pret: ["aß", "aßest", "aß", "aß", "aß", "aßen", "aßt", "aßen", "aßen"],
    pp: "gegessen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "trinken",
    infinitive: "trinken",
    stem: "trink",
    emoji: "🥤",
    usesSein: false,
    object: "Wasser",
    pres: ["trinke", "trinkst", "trinkt", "trinkt", "trinkt", "trinken", "trinkt", "trinken", "trinken"],
    pret: ["trank", "trankst", "trank", "trank", "trank", "tranken", "trankt", "tranken", "tranken"],
    pp: "getrunken",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "sehen",
    infinitive: "sehen",
    stem: "seh",
    emoji: "👁️",
    usesSein: false,
    object: "den Film",
    pres: ["sehe", "siehst", "sieht", "sieht", "sieht", "sehen", "seht", "sehen", "sehen"],
    pret: ["sah", "sahst", "sah", "sah", "sah", "sahen", "saht", "sahen", "sahen"],
    pp: "gesehen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "nehmen",
    infinitive: "nehmen",
    stem: "nehm",
    emoji: "✋",
    usesSein: false,
    object: "den Bus",
    pres: ["nehme", "nimmst", "nimmt", "nimmt", "nimmt", "nehmen", "nehmt", "nehmen", "nehmen"],
    pret: ["nahm", "nahmst", "nahm", "nahm", "nahm", "nahmen", "nahmt", "nahmen", "nahmen"],
    pp: "genommen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "geben",
    infinitive: "geben",
    stem: "geb",
    emoji: "🎁",
    usesSein: false,
    object: "eine Antwort",
    pres: ["gebe", "gibst", "gibt", "gibt", "gibt", "geben", "gebt", "geben", "geben"],
    pret: ["gab", "gabst", "gab", "gab", "gab", "gaben", "gabt", "gaben", "gaben"],
    pp: "gegeben",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "finden",
    infinitive: "finden",
    stem: "find",
    emoji: "🔍",
    usesSein: false,
    object: "den Schlüssel",
    pres: w("find"),
    pret: ["fand", "fandst", "fand", "fand", "fand", "fanden", "fandt", "fanden", "fanden"],
    pp: "gefunden",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "schreiben",
    infinitive: "schreiben",
    stem: "schreib",
    emoji: "✍️",
    usesSein: false,
    object: "einen Brief",
    pres: w("schreib"),
    pret: ["schrieb", "schriebst", "schrieb", "schrieb", "schrieb", "schrieben", "schriebt", "schrieben", "schrieben"],
    pp: "geschrieben",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "lesen",
    infinitive: "lesen",
    stem: "les",
    emoji: "📖",
    usesSein: false,
    object: "ein Buch",
    pres: ["lese", "liest", "liest", "liest", "liest", "lesen", "lest", "lesen", "lesen"],
    pret: ["las", "last", "las", "las", "las", "lasen", "last", "lasen", "lasen"],
    pp: "gelesen",
    partType: "strong",
    minLevel: "B1",
  },
  {
    id: "verstehen",
    infinitive: "verstehen",
    stem: "steh",
    emoji: "💡",
    usesSein: false,
    object: "die Frage",
    pres: ["verstehe", "verstehst", "versteht", "versteht", "versteht", "verstehen", "versteht", "verstehen", "verstehen"],
    pret: ["verstand", "verstandest", "verstand", "verstand", "verstand", "verstanden", "verstandet", "verstanden", "verstanden"],
    pp: "verstanden",
    partType: "inseparable",
    minLevel: "B1",
  },
  {
    id: "bekommen",
    infinitive: "bekommen",
    stem: "komm",
    emoji: "📬",
    usesSein: false,
    object: "eine E-Mail",
    pres: w("bekomm"),
    pret: wt("bekomm"),
    pp: "bekommen",
    partType: "inseparable",
    minLevel: "B1",
  },
  {
    id: "telefonieren",
    infinitive: "telefonieren",
    stem: "telefonier",
    emoji: "📞",
    usesSein: false,
    object: "mit Maya",
    pres: w("telefonier"),
    pret: wt("telefonier"),
    pp: "telefoniert",
    partType: "ieren",
    minLevel: "B1",
  },
  {
    id: "fliegen",
    infinitive: "fliegen",
    stem: "flieg",
    emoji: "✈️",
    usesSein: true,
    object: "nach Berlin",
    pres: w("flieg"),
    pret: ["flog", "flogst", "flog", "flog", "flog", "flogen", "flogt", "flogen", "flogen"],
    pp: "geflogen",
    partType: "strong",
    minLevel: "B2",
  },
  {
    id: "schwimmen",
    infinitive: "schwimmen",
    stem: "schwimm",
    emoji: "🏊",
    usesSein: true,
    object: "im See",
    pres: w("schwimm"),
    pret: ["schwamm", "schwammst", "schwamm", "schwamm", "schwamm", "schwammen", "schwammt", "schwammen", "schwammen"],
    pp: "geschwommen",
    partType: "strong",
    minLevel: "B2",
  },
  weak("heiraten", "heiraten", "heirat", "💍", "nächstes Jahr", "B2"),
  {
    id: "denken",
    infinitive: "denken",
    stem: "denk",
    emoji: "🤔",
    usesSein: false,
    object: "an dich",
    pres: w("denk"),
    pret: wt("denk"),
    pp: "gedacht",
    partType: "mixed",
    minLevel: "B2",
  },
  {
    id: "wissen",
    infinitive: "wissen",
    stem: "wiss",
    emoji: "🧠",
    usesSein: false,
    object: "die Antwort",
    pres: ["weiß", "weißt", "weiß", "weiß", "weiß", "wissen", "wisst", "wissen", "wissen"],
    pret: ["wusste", "wusstest", "wusste", "wusste", "wusste", "wussten", "wusstet", "wussten", "wussten"],
    pp: "gewusst",
    partType: "mixed",
    minLevel: "B2",
  },
  {
    id: "können",
    infinitive: "können",
    stem: "könn",
    emoji: "💪",
    usesSein: false,
    object: "das",
    pres: ["kann", "kannst", "kann", "kann", "kann", "können", "könnt", "können", "können"],
    pret: ["konnte", "konntest", "konnte", "konnte", "konnte", "konnten", "konntet", "konnten", "konnten"],
    pp: "gekonnt",
    partType: "strong",
    minLevel: "B2",
  },
  {
    id: "müssen",
    infinitive: "müssen",
    stem: "müss",
    emoji: "⏰",
    usesSein: false,
    object: "arbeiten",
    pres: ["muss", "musst", "muss", "muss", "muss", "müssen", "müsst", "müssen", "müssen"],
    pret: ["musste", "musstest", "musste", "musste", "musste", "mussten", "musstet", "mussten", "mussten"],
    pp: "gemusst",
    partType: "mixed",
    minLevel: "B2",
  },
  weak("lassen", "lassen", "lass", "🚪", "das so", "B2"),
  {
    id: "stehen",
    infinitive: "stehen",
    stem: "steh",
    emoji: "🧍",
    usesSein: false,
    object: "an der Tür",
    pres: w("steh"),
    pret: ["stand", "standest", "stand", "stand", "stand", "standen", "standet", "standen", "standen"],
    pp: "gestanden",
    partType: "strong",
    minLevel: "B2",
  },
  {
    id: "liegen",
    infinitive: "liegen",
    stem: "lieg",
    emoji: "🛋️",
    usesSein: false,
    object: "auf dem Tisch",
    pres: w("lieg"),
    pret: ["lag", "lagst", "lag", "lag", "lag", "lagen", "lagt", "lagen", "lagen"],
    pp: "gelegen",
    partType: "strong",
    minLevel: "B2",
  },
  {
    id: "aufstehen",
    infinitive: "aufstehen",
    stem: "steh",
    emoji: "⏰",
    usesSein: true,
    object: "früh",
    pres: ["stehe auf", "stehst auf", "steht auf", "steht auf", "steht auf", "stehen auf", "steht auf", "stehen auf", "stehen auf"],
    pret: ["stand auf", "standest auf", "stand auf", "stand auf", "stand auf", "standen auf", "standet auf", "standen auf", "standen auf"],
    pp: "aufgestanden",
    partType: "separable",
    separablePrefix: "auf",
    minLevel: "B1",
  },
  {
    id: "vergessen",
    infinitive: "vergessen",
    stem: "vergess",
    emoji: "🤦",
    usesSein: false,
    object: "den Termin",
    pres: ["vergesse", "vergisst", "vergisst", "vergisst", "vergisst", "vergessen", "vergesst", "vergessen", "vergessen"],
    pret: ["vergaß", "vergaßest", "vergaß", "vergaß", "vergaß", "vergaßen", "vergaßt", "vergaßen", "vergaßen"],
    pp: "vergessen",
    partType: "inseparable",
    minLevel: "B2",
  },
  {
    id: "erzählen",
    infinitive: "erzählen",
    stem: "erzähl",
    emoji: "📖",
    usesSein: false,
    object: "eine Geschichte",
    pres: w("erzähl"),
    pret: wt("erzähl"),
    pp: "erzählt",
    partType: "inseparable",
    minLevel: "B2",
  },
];

export const VERBS: Record<VerbId, VerbDef> = Object.fromEntries(VERB_LIST.map(v => [v.id, v]));

export const TENSES: TenseDef[] = [
  { id: "plusqu", label: "Plusquamperfekt", short: "Plus-", pos: 8, flagPos: 16, tokenState: "past", color: TENSE_ACCENT.plusqu!, showThread: false, minLevel: "B2" },
  { id: "praeter", label: "Präteritum", short: "Prät.", pos: 25, tokenState: "past", color: TENSE_ACCENT.praeter!, minLevel: "B1" },
  { id: "perf", label: "Perfekt", short: "Perf.", pos: 33, tokenState: "past", color: TENSE_ACCENT.perf!, showThread: true, minLevel: "B1" },
  { id: "praes", label: "Präsens", short: "Präs.", pos: 50, tokenState: "present", color: TENSE_ACCENT.praes!, minLevel: "B1" },
  { id: "fut1", label: "Futur I", short: "Fut. I", pos: 67, tokenState: "future", color: TENSE_ACCENT.fut1!, minLevel: "B1" },
  { id: "fut2", label: "Futur II", short: "Fut. II", pos: 84, flagPos: 92, tokenState: "futdone", color: TENSE_ACCENT.fut2!, minLevel: "B2" },
];

export function subjectIndex(id: SubjectId): number {
  return SUBJECTS.findIndex(s => s.id === id);
}

export function tenseById(id: BuildTenseId): TenseDef {
  return TENSES.find(t => t.id === id)!;
}

export function verbsForLevel(level: TenseLevel): VerbDef[] {
  return VERB_LIST.filter(v => levelIncludes(level, v.minLevel));
}

export function timelineTensesForLevel(level: TenseLevel): TenseDef[] {
  return TENSES.filter(t => levelIncludes(level, t.minLevel));
}

export function buildTensesForLevel(level: TenseLevel): TenseDef[] {
  return timelineTensesForLevel(level);
}

function joinParts(segments: SentencePart[]): string {
  return segments.map(s => s.text).join("");
}

function auxPret(verb: VerbDef, si: number): string {
  return verb.usesSein ? SEIN_PRET[si]! : HABEN_PRET[si]!;
}

function auxPres(verb: VerbDef, si: number): string {
  return verb.usesSein ? SEIN_PRES[si]! : HABEN_PRES[si]!;
}

function objectChunk(verb: VerbDef): SentencePart[] {
  if (!verb.object) return [];
  return [{ text: ` ${verb.object}`, highlight: false }];
}

export function parts(verbId: VerbId, tenseId: BuildTenseId, subjectId: SubjectId): { segments: SentencePart[]; full: string } {
  return bracketParts(verbId, tenseId, subjectId);
}

export function bracketParts(verbId: VerbId, tenseId: BuildTenseId, subjectId: SubjectId): BracketParts {
  const verb = VERBS[verbId] ?? VERBS.machen!;
  const subj = SUBJECTS.find(s => s.id === subjectId)!;
  const si = subjectIndex(subjectId);
  const head: SentencePart = { text: `${subj.start} `, highlight: false };
  const midParts = objectChunk(verb);
  const middle = midParts.map(p => p.text).join("");

  switch (tenseId) {
    case "praes": {
      const v2 = verb.pres[si]!;
      const segments: SentencePart[] = [head, { text: v2, highlight: true }, ...midParts];
      return { v2, middle, end: "", hasBracket: false, segments, full: joinParts(segments) };
    }
    case "praeter": {
      const v2 = verb.pret[si]!;
      const segments: SentencePart[] = [head, { text: v2, highlight: true }, ...midParts];
      return { v2, middle, end: "", hasBracket: false, segments, full: joinParts(segments) };
    }
    case "perf": {
      const v2 = auxPres(verb, si);
      const end = verb.pp;
      const segments: SentencePart[] = [head, { text: v2, highlight: true }, ...midParts, { text: ` ${end}`, highlight: true }];
      return { v2, middle, end, hasBracket: true, segments, full: joinParts(segments) };
    }
    case "plusqu": {
      const v2 = auxPret(verb, si);
      const end = verb.pp;
      const segments: SentencePart[] = [head, { text: v2, highlight: true }, ...midParts, { text: ` ${end}`, highlight: true }];
      return { v2, middle, end, hasBracket: true, segments, full: joinParts(segments) };
    }
    case "fut1": {
      const v2 = WERDEN_PRES[si]!;
      const end = verb.infinitive;
      const segments: SentencePart[] = [head, { text: v2, highlight: true }, ...midParts, { text: ` ${end}`, highlight: true }];
      return { v2, middle, end, hasBracket: true, segments, full: joinParts(segments) };
    }
    case "fut2": {
      const v2 = WERDEN_PRES[si]!;
      const end = `${verb.pp} ${verb.usesSein ? "sein" : "haben"}`;
      const segments: SentencePart[] = [head, { text: v2, highlight: true }, ...midParts, { text: ` ${end}`, highlight: true }];
      return { v2, middle, end, hasBracket: true, segments, full: joinParts(segments) };
    }
    default:
      return { v2: "", middle: "", end: "", hasBracket: false, segments: [head], full: subj.start };
  }
}

export interface BuildPiece {
  id: string;
  text: string;
  role: "v2" | "end" | "distractor";
}

export function buildPiecePool(verbId: VerbId, tenseId: BuildTenseId, subjectId: SubjectId): BuildPiece[] {
  const verb = VERBS[verbId] ?? VERBS.machen!;
  const si = subjectIndex(subjectId);
  const target = bracketParts(verbId, tenseId, subjectId);
  const pieces: BuildPiece[] = [
    { id: "v2-correct", text: target.v2, role: "v2" },
  ];
  if (target.hasBracket) {
    pieces.push({ id: "end-correct", text: target.end, role: "end" });
  }

  if (tenseId === "perf" || tenseId === "plusqu") {
    const wrongAux = verb.usesSein ? HABEN_PRES[si]! : SEIN_PRES[si]!;
    if (tenseId === "plusqu") {
      const wrongAuxPret = verb.usesSein ? HABEN_PRET[si]! : SEIN_PRET[si]!;
      pieces.push({ id: "aux-wrong", text: wrongAuxPret, role: "distractor" });
    } else {
      pieces.push({ id: "aux-wrong", text: wrongAux, role: "distractor" });
    }
    pieces.push({ id: "inf-wrong", text: verb.infinitive, role: "distractor" });
  }
  if (tenseId === "fut1") {
    pieces.push({ id: "pp-wrong", text: verb.pp, role: "distractor" });
  }
  if (tenseId === "fut2") {
    pieces.push({ id: "end-wrong", text: `${verb.pp} ${verb.usesSein ? "haben" : "sein"}`, role: "distractor" });
  }

  return shuffle(pieces);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function posToTokenPx(pos: number, roadWidth: number): number {
  if (roadWidth <= 0) return 0;
  return (pos / 100) * roadWidth - TOKEN / 2;
}

export function posToPx(pos: number, roadWidth: number): number {
  if (roadWidth <= 0) return 0;
  return (pos / 100) * roadWidth;
}

export const VERB_COUNT = VERB_LIST.length;
