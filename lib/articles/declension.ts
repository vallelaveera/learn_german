import type { ArticleType, CaseId, GenderId } from "./types";

export const CASES: CaseId[] = ["nom", "akk", "dat", "gen"];
export const GENDERS: GenderId[] = ["m", "f", "n", "pl"];

export const CASE_LABEL: Record<CaseId, string> = {
  nom: "Nominativ",
  akk: "Akkusativ",
  dat: "Dativ",
  gen: "Genitiv",
};

export const CASE_QUESTION: Record<CaseId, string> = {
  nom: "Wer?",
  akk: "Wen/Was?",
  dat: "Wem?",
  gen: "Wessen?",
};

export const CASE_COLOR: Record<CaseId, string> = {
  nom: "#DBEAFE",
  akk: "#FEE2E2",
  dat: "#D1FAE5",
  gen: "#EDE9FE",
};

export const CASE_TEXT: Record<CaseId, string> = {
  nom: "#1D4ED8",
  akk: "#E24B4A",
  dat: "#059669",
  gen: "#7F77DD",
};

export const GENDER_LABEL: Record<GenderId, string> = {
  m: "Männlich",
  f: "Weiblich",
  n: "Sächlich",
  pl: "Mehrzahl",
};

export const GENDER_SHORT: Record<GenderId, string> = {
  m: "m",
  f: "f",
  n: "n",
  pl: "pl",
};

export const DEFINITE: Record<CaseId, Record<GenderId, string>> = {
  nom: { m: "der", f: "die", n: "das", pl: "die" },
  akk: { m: "den", f: "die", n: "das", pl: "die" },
  dat: { m: "dem", f: "der", n: "dem", pl: "den" },
  gen: { m: "des", f: "der", n: "des", pl: "der" },
};

export const INDEFINITE: Record<CaseId, Record<GenderId, string>> = {
  nom: { m: "ein", f: "eine", n: "ein", pl: "—" },
  akk: { m: "einen", f: "eine", n: "ein", pl: "—" },
  dat: { m: "einem", f: "einer", n: "einem", pl: "—" },
  gen: { m: "eines", f: "einer", n: "eines", pl: "—" },
};

export const DEF_CHANGED: Partial<Record<CaseId, GenderId[]>> = {
  akk: ["m"],
  dat: ["m", "f", "n", "pl"],
  gen: ["m", "f", "n", "pl"],
};

export const INDEF_CHANGED: Partial<Record<CaseId, GenderId[]>> = {
  akk: ["m"],
  dat: ["m", "f", "n"],
  gen: ["m", "f", "n"],
};

export function getArticles(type: ArticleType): Record<CaseId, Record<GenderId, string>> {
  return type === "def" ? DEFINITE : INDEFINITE;
}

export function getChangedSet(type: ArticleType): Partial<Record<CaseId, GenderId[]>> {
  return type === "def" ? DEF_CHANGED : INDEF_CHANGED;
}

export function isChangedFromNominativ(
  type: ArticleType,
  caseId: CaseId,
  gender: GenderId,
): boolean {
  if (caseId === "nom") return false;
  const changed = getChangedSet(type)[caseId];
  return Boolean(changed && changed.includes(gender));
}

export function articleValue(type: ArticleType, caseId: CaseId, gender: GenderId): string {
  return getArticles(type)[caseId][gender];
}
