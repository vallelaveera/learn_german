/** German tense timeline — data tables & conjugation helper (web port of RN guide). */

export type SubjectId = "ich" | "du" | "er" | "sie3" | "es" | "wir" | "ihr" | "siePl" | "Sie";
export type VerbId = "machen" | "gehen" | "sprechen";
export type TenseId = "plusqu" | "praeter" | "perf" | "praes" | "fut1" | "fut2";
export type TokenState = "past" | "present" | "future" | "futdone";

export interface SubjectDef {
  id: SubjectId;
  label: string;
  /** Sentence-initial form (capitalised where customary). */
  start: string;
}

export interface SentencePart {
  text: string;
  highlight: boolean;
}

export interface TenseDef {
  id: TenseId;
  label: string;
  short: string;
  /** 0–100 position on the time road. */
  pos: number;
  /** Reference flag anchor (Plusquamperfekt, Futur II). */
  flagPos?: number;
  tokenState: TokenState;
  color: string;
  /** Dotted thread from action pos to JETZT (50). */
  showThread?: boolean;
}

export interface VerbDef {
  id: VerbId;
  infinitive: string;
  emoji: string;
  usesSein: boolean;
  /** Object / complement in the demo sentence. Empty for gehen. */
  object: string;
  pres: readonly string[];
  pret: readonly string[];
  pp: string;
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

/** haben — Präsens */
export const HABEN_PRES = [
  "habe", "hast", "hat", "hat", "hat", "haben", "habt", "haben", "haben",
] as const;

/** haben — Präteritum */
export const HABEN_PRET = [
  "hatte", "hattest", "hatte", "hatte", "hatte", "hatten", "hattet", "hatten", "hatten",
] as const;

/** sein — Präsens */
export const SEIN_PRES = ["bin", "bist", "ist", "ist", "ist", "sind", "seid", "sind", "sind"] as const;

/** sein — Präteritum */
export const SEIN_PRET = ["war", "warst", "war", "war", "war", "waren", "wart", "waren", "waren"] as const;

/** werden — all tenses use present forms for Futur I / II */
export const WERDEN_PRES = [
  "werde", "wirst", "wird", "wird", "wird", "werden", "werdet", "werden", "werden",
] as const;

export const VERBS: Record<VerbId, VerbDef> = {
  machen: {
    id: "machen",
    infinitive: "machen",
    emoji: "🔨",
    usesSein: false,
    object: "das",
    pres: ["mache", "machst", "macht", "macht", "macht", "machen", "macht", "machen", "machen"],
    pret: ["machte", "machtest", "machte", "machte", "machte", "machten", "machtet", "machten", "machten"],
    pp: "gemacht",
  },
  gehen: {
    id: "gehen",
    infinitive: "gehen",
    emoji: "🚶",
    usesSein: true,
    object: "",
    pres: ["gehe", "gehst", "geht", "geht", "geht", "gehen", "geht", "gehen", "gehen"],
    pret: ["ging", "gingst", "ging", "ging", "ging", "gingen", "gingt", "gingen", "gingen"],
    pp: "gegangen",
  },
  sprechen: {
    id: "sprechen",
    infinitive: "sprechen",
    emoji: "🗣️",
    usesSein: false,
    object: "Deutsch",
    pres: ["spreche", "sprichst", "spricht", "spricht", "spricht", "sprechen", "sprecht", "sprechen", "sprechen"],
    pret: ["sprach", "sprachst", "sprach", "sprach", "sprach", "sprachen", "spracht", "sprachen", "sprachen"],
    pp: "gesprochen",
  },
};

export const TENSES: TenseDef[] = [
  {
    id: "plusqu",
    label: "Plusquamperfekt",
    short: "Plus-",
    pos: 8,
    flagPos: 16,
    tokenState: "past",
    color: "#4A5568",
  },
  {
    id: "praeter",
    label: "Präteritum",
    short: "Prät.",
    pos: 25,
    tokenState: "past",
    color: "#5B6ABF",
  },
  {
    id: "perf",
    label: "Perfekt",
    short: "Perf.",
    pos: 33,
    tokenState: "past",
    color: "#5B6ABF",
    showThread: true,
  },
  {
    id: "praes",
    label: "Präsens",
    short: "Präs.",
    pos: 50,
    tokenState: "present",
    color: "#1F7A5C",
  },
  {
    id: "fut1",
    label: "Futur I",
    short: "Fut. I",
    pos: 67,
    tokenState: "future",
    color: "#B45309",
  },
  {
    id: "fut2",
    label: "Futur II",
    short: "Fut. II",
    pos: 84,
    flagPos: 92,
    tokenState: "futdone",
    color: "#B45309",
  },
];

export function subjectIndex(id: SubjectId): number {
  return SUBJECTS.findIndex(s => s.id === id);
}

export function tenseById(id: TenseId): TenseDef {
  return TENSES.find(t => t.id === id)!;
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

/** Build highlighted sentence segments for the active verb × tense × subject. */
export function parts(verbId: VerbId, tenseId: TenseId, subjectId: SubjectId): { segments: SentencePart[]; full: string } {
  const verb = VERBS[verbId];
  const subj = SUBJECTS.find(s => s.id === subjectId)!;
  const si = subjectIndex(subjectId);
  const head: SentencePart = { text: `${subj.start} `, highlight: false };

  switch (tenseId) {
    case "praes": {
      const segments: SentencePart[] = [
        head,
        { text: verb.pres[si]!, highlight: true },
        ...objectChunk(verb),
      ];
      return { segments, full: joinParts(segments) };
    }
    case "praeter": {
      const segments: SentencePart[] = [
        head,
        { text: verb.pret[si]!, highlight: true },
        ...objectChunk(verb),
      ];
      return { segments, full: joinParts(segments) };
    }
    case "perf": {
      const segments: SentencePart[] = [
        head,
        { text: auxPres(verb, si), highlight: true },
        ...objectChunk(verb),
        { text: ` ${verb.pp}`, highlight: true },
      ];
      return { segments, full: joinParts(segments) };
    }
    case "plusqu": {
      const segments: SentencePart[] = [
        head,
        { text: auxPret(verb, si), highlight: true },
        ...objectChunk(verb),
        { text: ` ${verb.pp}`, highlight: true },
      ];
      return { segments, full: joinParts(segments) };
    }
    case "fut1": {
      const segments: SentencePart[] = [
        head,
        { text: WERDEN_PRES[si]!, highlight: true },
        ...objectChunk(verb),
        { text: ` ${verb.infinitive}`, highlight: true },
      ];
      return { segments, full: joinParts(segments) };
    }
    case "fut2": {
      const tailAux = verb.usesSein ? "sein" : "haben";
      const segments: SentencePart[] = [
        head,
        { text: WERDEN_PRES[si]!, highlight: true },
        ...objectChunk(verb),
        { text: ` ${verb.pp} ${tailAux}`, highlight: true },
      ];
      return { segments, full: joinParts(segments) };
    }
    default:
      return { segments: [head], full: subj.start };
  }
}

/** Layout helper: percent → pixel X for token center (TOKEN/2 subtracted outside transform). */
export function posToTokenPx(pos: number, roadWidth: number): number {
  if (roadWidth <= 0) return 0;
  return (pos / 100) * roadWidth - TOKEN / 2;
}

export function posToPx(pos: number, roadWidth: number): number {
  if (roadWidth <= 0) return 0;
  return (pos / 100) * roadWidth;
}
