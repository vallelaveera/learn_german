import type { TenseTab } from "./types";

export interface TenseTabTheme {
  tc: string;
  tbg: string;
  tbd: string;
  tmid: string;
}

export const TENSE_TAB_THEMES: Record<TenseTab, TenseTabTheme> = {
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
  workshop: {
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

/** Per-tense accent colours on the timeline / bracket views. */
export const TENSE_ACCENT: Record<string, string> = {
  plusqu: "#4A5568",
  praeter: "#5B6ABF",
  perf: "#5B6ABF",
  praes: "#1F7A5C",
  fut1: "#B45309",
  fut2: "#B45309",
  konj2: "#7F77DD",
  passiv: "#378ADD",
  konj1: "#993C1D",
  doubleInf: "#085041",
};
