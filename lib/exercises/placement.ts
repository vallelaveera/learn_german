import { getPlacementEntries } from "./load";
import { toBinaryCards } from "./cards";
import type { PlacementLevel, PlacementRound } from "./types";

const ROUND_LIMITS: Record<PlacementLevel, number> = {
  A1: 10,
  A2: 6,
  B1: 4,
};

const ADVANCE_THRESHOLDS: Record<PlacementLevel, number> = {
  A1: 0.75,
  A2: 0.65,
  B1: 0.5,
};

export function getPlacementRound(level: PlacementLevel): PlacementRound {
  const entries = getPlacementEntries(level).slice(0, ROUND_LIMITS[level]);
  return { level, cards: toBinaryCards(entries, "placement") };
}

export function scoreRound(correct: number, total: number): number {
  if (!total) return 0;
  return correct / total;
}

export function shouldAdvance(level: PlacementLevel, accuracy: number): boolean {
  return accuracy >= ADVANCE_THRESHOLDS[level];
}

export function nextPlacementLevel(level: PlacementLevel): PlacementLevel | null {
  if (level === "A1") return "A2";
  if (level === "A2") return "B1";
  return null;
}

export function levelFromPlacement(
  completed: PlacementLevel[],
  accuracies: Record<PlacementLevel, number>
): string {
  let result = "A1";
  if (completed.includes("A1") && shouldAdvance("A1", accuracies.A1 ?? 0)) {
    result = "A2";
  }
  if (completed.includes("A2") && shouldAdvance("A2", accuracies.A2 ?? 0)) {
    result = "B1";
  }
  if (completed.includes("B1") && shouldAdvance("B1", accuracies.B1 ?? 0)) {
    result = "B1+";
  }
  return result;
}
