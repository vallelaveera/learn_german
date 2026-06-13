import type { CaseGender, CaseKey, CaseTab } from "./types";

export interface CaseTabTheme {
  tc: string;
  tbg: string;
  tbd: string;
  tmid: string;
}

export const CASE_TAB_THEMES: Record<CaseTab, CaseTabTheme> = {
  build: {
    tc: "#085041",
    tbg: "rgba(8, 80, 65, 0.1)",
    tbd: "rgba(8, 80, 65, 0.28)",
    tmid: "rgba(8, 80, 65, 0.55)",
  },
  patterns: {
    tc: "#3C3489",
    tbg: "rgba(60, 52, 137, 0.1)",
    tbd: "rgba(60, 52, 137, 0.28)",
    tmid: "rgba(60, 52, 137, 0.55)",
  },
  portals: {
    tc: "#993C1D",
    tbg: "rgba(153, 60, 29, 0.1)",
    tbd: "rgba(153, 60, 29, 0.28)",
    tmid: "rgba(153, 60, 29, 0.55)",
  },
  progress: {
    tc: "#3C3489",
    tbg: "rgba(60, 52, 137, 0.1)",
    tbd: "rgba(60, 52, 137, 0.28)",
    tmid: "rgba(60, 52, 137, 0.55)",
  },
};

export const CASE_COLORS: Record<CaseKey, string> = {
  nom: "#1D9E75",
  akk: "#D85A30",
  dat: "#378ADD",
  gen: "#7F77DD",
  wechsel: "#BA7517",
};

export const CASE_LABEL: Record<CaseKey, string> = {
  nom: "Nominativ",
  akk: "Akkusativ",
  dat: "Dativ",
  gen: "Genitiv",
  wechsel: "Wechsel",
};

export const CASE_ROLE: Record<Exclude<CaseKey, "wechsel">, string> = {
  nom: "the doer",
  akk: "the target",
  dat: "the receiver",
  gen: "the owner",
};

export const CASE_QUESTION: Record<Exclude<CaseKey, "wechsel">, string> = {
  nom: "wer? / was?",
  akk: "wen? / was?",
  dat: "wem?",
  gen: "wessen?",
};

export const CASE_CHARACTER: Record<CaseGender | "pl", string> = {
  m: "The King — der → den → dem → des",
  f: "The Queen — die stays, der in Dat/Gen",
  n: "The child — das → dem → des",
  pl: "The crowd — die → den (+n) → der",
};
