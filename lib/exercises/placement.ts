import { getPlacementEntries } from "./load";
import { toBinaryCards } from "./cards";
import type { PlacementLevel, PlacementRound } from "./types";

const PROD_ROUND_LIMITS: Record<PlacementLevel, number> = {
  A1: 10,
  A2: 6,
  B1: 4,
};

const BETA_QUESTION_COUNT = 5;

const ADVANCE_THRESHOLDS: Record<PlacementLevel, number> = {
  A1: 0.75,
  A2: 0.65,
  B1: 0.5,
};

/** Short 5-question placement for beta — set PLACEMENT_BETA_SHORT=true on Vercel. */
export function isPlacementBetaShort(): boolean {
  return process.env.PLACEMENT_BETA_SHORT === "true";
}

export function getPlacementQuestionCount(): number {
  return isPlacementBetaShort() ? BETA_QUESTION_COUNT : PROD_ROUND_LIMITS.A1;
}

export function getPlacementRound(level: PlacementLevel): PlacementRound {
  if (isPlacementBetaShort()) {
    const entries = getPlacementEntries("A1").slice(0, BETA_QUESTION_COUNT);
    return { level: "A1", cards: toBinaryCards(entries, "placement") };
  }

  const entries = getPlacementEntries(level).slice(0, PROD_ROUND_LIMITS[level]);
  return { level, cards: toBinaryCards(entries, "placement") };
}

export function scoreRound(correct: number, total: number): number {
  if (!total) return 0;
  return correct / total;
}

export function shouldAdvance(level: PlacementLevel, accuracy: number): boolean {
  if (isPlacementBetaShort()) return false;
  return accuracy >= ADVANCE_THRESHOLDS[level];
}

export function nextPlacementLevel(level: PlacementLevel): PlacementLevel | null {
  if (isPlacementBetaShort()) return null;
  if (level === "A1") return "A2";
  if (level === "A2") return "B1";
  return null;
}

/** Map correct answers (out of 5) to a starting level in beta mode. */
export function levelFromBetaScore(correct: number): string {
  if (correct >= 5) return "B1";
  if (correct >= 3) return "A2";
  return "A1";
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
