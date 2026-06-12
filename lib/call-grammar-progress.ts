import type { Message } from "./types";
import { parseCorrectionField } from "./corrections";

export type GrammarTurnStatus = "pending" | "correct" | "corrected";

export interface GrammarTurnInfo {
  status: GrammarTurnStatus;
  correctionText?: string;
  correctForm?: string;
  note?: string;
}

export function getGrammarTurnInfo(msg: Message): GrammarTurnInfo {
  if (msg.role !== "user") {
    return { status: "pending" };
  }
  if (!msg.grammarEvaluated) {
    return { status: "pending" };
  }
  if (msg.correction?.trim()) {
    const parsed = parseCorrectionField(msg.correction);
    return {
      status: "corrected",
      correctionText: msg.correction,
      correctForm: parsed.correct,
      note: parsed.note,
    };
  }
  return { status: "correct" };
}

export function computeLiveGrammarProgress(messages: Message[]) {
  const userMessages = messages.filter(m => m.role === "user");
  const evaluated = userMessages.filter(m => m.grammarEvaluated);
  const correctCount = evaluated.filter(m => !m.correction?.trim()).length;
  const correctedCount = evaluated.length - correctCount;

  return {
    total: userMessages.length,
    evaluated: evaluated.length,
    correct: correctCount,
    corrected: correctedCount,
    pending: userMessages.length - evaluated.length,
    score: evaluated.length > 0 ? Math.round((correctCount / evaluated.length) * 100) : null,
  };
}

export function grammarScoreColor(score: number | null): string {
  if (score === null) return "var(--text-muted)";
  if (score >= 80) return "#1D9E75";
  if (score >= 50) return "#D97706";
  return "#E24B4A";
}
