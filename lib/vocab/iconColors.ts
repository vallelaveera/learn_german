export const ICON_COLORS = {
  new: {
    fill: "#7F77DD",
    inner: "#EEEDFE",
    bg: "#EEEDFE",
    badge: "#3C3489",
    badgeBg: "#EEEDFE",
    label: "Neu",
  },
  practice: {
    fill: "#EF9F27",
    inner: "#FAEEDA",
    bg: "#FAEEDA",
    badge: "#633806",
    badgeBg: "#FAEEDA",
    label: "Üben",
  },
  mastered: {
    fill: "#1D9E75",
    inner: "#EAF3DE",
    bg: "#EAF3DE",
    badge: "#27500A",
    badgeBg: "#EAF3DE",
    label: "Gemeistert",
  },
} as const;

export type VocabStatus = keyof typeof ICON_COLORS;

export function getStatusFromScore(
  seenCount: number,
  correctCount: number,
): VocabStatus {
  if (seenCount === 0) return "new";
  const ratio = correctCount / seenCount;
  if (ratio >= 0.8 && seenCount >= 3) return "mastered";
  return "practice";
}
