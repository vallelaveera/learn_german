import type { CaseKey, CaseLevel, CaseSentence, PortalSet } from "./types";

export const PORTAL_SETS: PortalSet[] = [
  {
    id: "dogfu",
    label: "DOGFU",
    acronym: "DOGFU",
    caseKey: "akk",
    prepositions: ["durch", "für", "gegen", "ohne", "um"],
    level: "B1",
    hint: "Durch, für, gegen, ohne, um → always Akkusativ",
  },
  {
    id: "dativ",
    label: "Dativ portals",
    caseKey: "dat",
    prepositions: ["aus", "außer", "bei", "gegenüber", "mit", "nach", "seit", "von", "zu"],
    level: "B1",
    hint: "These prepositions always take Dativ",
  },
  {
    id: "genitiv-b1",
    label: "Genitiv portals",
    caseKey: "gen",
    prepositions: ["statt", "trotz", "während", "wegen"],
    level: "B1",
    hint: "(an)statt, trotz, während, wegen → Genitiv",
  },
  {
    id: "genitiv-c1",
    label: "Genitiv C1+",
    caseKey: "gen",
    prepositions: ["mittels", "anlässlich", "hinsichtlich", "infolge", "innerhalb", "außerhalb"],
    level: "C1",
    hint: "Formal genitive prepositions (C1+)",
  },
  {
    id: "wechsel",
    label: "Wechselpräpositionen",
    caseKey: "wechsel",
    prepositions: ["an", "auf", "hinter", "in", "neben", "über", "unter", "vor", "zwischen"],
    level: "B1",
    hint: "wohin? → Akk (motion) · wo? → Dat (location)",
  },
];

export const CASE_SENTENCES: CaseSentence[] = [
  {
    id: "nom-1",
    caseKey: "nom",
    level: "B1",
    pre: "",
    highlight: "Der Hund",
    post: " schläft.",
    en: "The dog is sleeping.",
  },
  {
    id: "akk-1",
    caseKey: "akk",
    level: "B1",
    pre: "Ich sehe ",
    highlight: "den Hund",
    post: ".",
    en: "I see the dog.",
  },
  {
    id: "dat-1",
    caseKey: "dat",
    level: "B1",
    pre: "Ich helfe ",
    highlight: "dem Kind",
    post: ".",
    en: "I help the child.",
  },
  {
    id: "gen-1",
    caseKey: "gen",
    level: "B1",
    pre: "Das ist das Auto ",
    highlight: "des Mannes",
    post: ".",
    en: "That is the man's car.",
  },
  {
    id: "wechsel-1",
    caseKey: "wechsel",
    level: "B1",
    pre: "Ich gehe ",
    highlight: "in die Schule",
    post: ".",
    en: "I go into the school. (motion → Akk)",
  },
  {
    id: "wechsel-2",
    caseKey: "wechsel",
    level: "B1",
    pre: "Ich bin ",
    highlight: "in der Schule",
    post: ".",
    en: "I am in the school. (location → Dat)",
  },
  {
    id: "akk-2",
    caseKey: "akk",
    level: "B2",
    pre: "Er wartet ",
    highlight: "auf den Bus",
    post: ".",
    en: "He waits for the bus.",
  },
  {
    id: "dat-2",
    caseKey: "dat",
    level: "B2",
    pre: "Sie nimmt teil ",
    highlight: "an dem Kurs",
    post: ".",
    en: "She takes part in the course.",
  },
  {
    id: "gen-c1",
    caseKey: "gen",
    level: "C1",
    pre: "",
    highlight: "Mittels",
    post: " neuer Methoden gelingt der Erfolg.",
    en: "By means of new methods, success is achieved.",
  },
];

export const WEAK_ADJ: Record<string, string> = {
  gut: "gut",
};

export function sentencesForLevel(selected: CaseLevel, caseKey?: CaseKey): CaseSentence[] {
  const order: CaseLevel[] = ["B1", "B2", "C1", "C2"];
  return CASE_SENTENCES.filter(s => {
    if (caseKey && s.caseKey !== caseKey) return false;
    return order.indexOf(s.level) <= order.indexOf(selected);
  });
}

export function portalsForLevel(selected: CaseLevel): PortalSet[] {
  const order: CaseLevel[] = ["B1", "B2", "C1", "C2"];
  return PORTAL_SETS.filter(p => order.indexOf(p.level) <= order.indexOf(selected));
}

export const DATIVE_VERBS = [
  "helfen", "danken", "folgen", "gehören", "gefallen", "gratulieren",
  "antworten", "glauben", "vertrauen", "begegnen", "passen", "schmecken",
];

export const FIXED_PREP_VERBS = [
  { verb: "warten", prep: "auf", case: "akk" as const },
  { verb: "denken", prep: "an", case: "akk" as const },
  { verb: "teilnehmen", prep: "an", case: "dat" as const },
  { verb: "sich interessieren", prep: "für", case: "akk" as const },
];
