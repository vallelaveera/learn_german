import { Message } from "./types";
import { extractCorrectionsFromMessages } from "./corrections";
import { computeLiveGrammarProgress } from "./call-grammar-progress";

export interface CallCorrectionDisplay {
  said: string;
  correct: string;
  note?: string;
}

export function extractCallCorrections(messages: Message[]): CallCorrectionDisplay[] {
  return extractCorrectionsFromMessages(messages, "report").map(c => ({
    said: c.said,
    correct: c.correct,
    note: c.note,
  }));
}

export function computeCallReportStats(messages: Message[], durationSec: number) {
  const userMessages = messages.filter(m => m.role === "user");
  const userTurns = userMessages.length;
  const corrections = extractCallCorrections(messages);
  const progress = computeLiveGrammarProgress(messages);
  const grammarScore =
    progress.evaluated > 0
      ? (progress.score ?? 0)
      : userTurns > 0
        ? Math.round(((userTurns - corrections.length) / userTurns) * 100)
        : 0;

  const fmtDuration = `${String(Math.floor(durationSec / 60)).padStart(2, "0")}:${String(durationSec % 60).padStart(2, "0")}`;

  return {
    durationSec,
    durationLabel: fmtDuration,
    sentenceCount: userTurns,
    grammarScore,
    corrections,
    /** @deprecated use corrections — kept for session save compat */
    newWords: corrections.map(c => c.correct).slice(0, 15),
  };
}
