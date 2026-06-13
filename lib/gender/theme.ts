import type { GenderTab } from "@/lib/gender/types";

export interface GenderTabTheme {
  tc: string;
  tbg: string;
  tbd: string;
  tmid: string;
}

export const GENDER_TAB_THEMES: Record<GenderTab, GenderTabTheme> = {
  practice: {
    tc: "#3C3489",
    tbg: "rgba(60, 52, 137, 0.1)",
    tbd: "rgba(60, 52, 137, 0.28)",
    tmid: "rgba(60, 52, 137, 0.55)",
  },
  patterns: {
    tc: "#72243E",
    tbg: "rgba(114, 36, 62, 0.1)",
    tbd: "rgba(114, 36, 62, 0.28)",
    tmid: "rgba(114, 36, 62, 0.55)",
  },
  sort: {
    tc: "#085041",
    tbg: "rgba(8, 80, 65, 0.1)",
    tbd: "rgba(8, 80, 65, 0.28)",
    tmid: "rgba(8, 80, 65, 0.55)",
  },
  progress: {
    tc: "#3C3489",
    tbg: "rgba(60, 52, 137, 0.1)",
    tbd: "rgba(60, 52, 137, 0.28)",
    tmid: "rgba(60, 52, 137, 0.55)",
  },
};

export const GENDER_ARTICLE_COLORS: Record<"der" | "die" | "das", string> = {
  der: "#2563EB",
  die: "#DB2777",
  das: "#059669",
};
