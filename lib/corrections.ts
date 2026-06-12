import { v4 as uuidv4 } from "uuid";
import type { HomeworkSentence, Message } from "./types";
import { tokenizeSentence } from "./exercises/sentences";

export interface CallCorrection {
  id: string;
  sessionId: string;
  said: string;
  correct: string;
  note?: string;
  ts: number;
  practiced: boolean;
}

export const MIN_SATZBAU_WORDS = 3;
export const MAX_CORRECTIONS_PER_SESSION = 5;

export function parseCorrectionField(correction: string): { correct: string; note?: string } {
  const trimmed = correction.trim();
  const guillemet = trimmed.match(/«([^»]+)»/);
  if (guillemet) {
    const note = trimmed.replace(/«[^»]+»\s*/, "").replace(/^[—–-]\s*/, "").trim();
    return { correct: guillemet[1].trim(), note: note || undefined };
  }
  const quoted = trimmed.match(/^["']([^"']+)["']/);
  if (quoted) {
    const note = trimmed.replace(/^["'][^"']+["']\s*/, "").replace(/^[—–-]\s*/, "").trim();
    return { correct: quoted[1].trim(), note: note || undefined };
  }
  const dashSplit = trimmed.split(/\s+[—–-]\s+/);
  if (dashSplit.length >= 2) {
    return { correct: dashSplit[0].trim(), note: dashSplit.slice(1).join(" — ").trim() };
  }
  return { correct: trimmed };
}

export function isSatzbauEligible(correct: string): boolean {
  return tokenizeSentence(correct).length >= MIN_SATZBAU_WORDS;
}

function normalizeKey(said: string, correct: string): string {
  return `${said.toLowerCase().trim()}|${correct.toLowerCase().trim()}`;
}

/** Pull Korrektur line from Maya hint block (translation field or raw text). */
export function extractKorrekturFromHintBlock(hintBlock?: string): string | undefined {
  if (!hintBlock?.trim()) return undefined;
  const parts = hintBlock.split(/\s·\s|\n/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (/^Korrektur:/i.test(trimmed)) {
      return trimmed.replace(/^Korrektur:\s*/i, "").trim();
    }
  }
  return undefined;
}

function resolveUserCorrection(msg: Message, messages: Message[], index: number): string | undefined {
  const direct = msg.correction?.trim();
  if (direct) return direct;
  const next = messages[index + 1];
  if (next?.role === "assistant") {
    return extractKorrekturFromHintBlock(next.translation);
  }
  return undefined;
}

export function extractCorrectionsFromMessages(
  messages: Message[],
  sessionId: string,
): CallCorrection[] {
  const seen = new Set<string>();
  const out: CallCorrection[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== "user") continue;

    const correctionRaw = resolveUserCorrection(msg, messages, i);
    if (!correctionRaw) continue;

    const { correct, note } = parseCorrectionField(correctionRaw);
    if (!correct) continue;

    const said = msg.content.replace(/<end>/g, "").trim();
    const key = normalizeKey(said, correct);
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: `c-${sessionId.slice(0, 8)}-${out.length}`,
      sessionId,
      said,
      correct,
      note,
      ts: msg.timestamp ?? Date.now(),
      practiced: false,
    });

    if (out.length >= MAX_CORRECTIONS_PER_SESSION) break;
  }

  return out;
}

export function homeworkSentencesFromMessages(
  messages: Message[],
  sessionId: string,
): HomeworkSentence[] {
  return extractCorrectionsFromMessages(messages, sessionId).map(c => ({
    id: uuidv4(),
    text: c.correct,
    userSaid: c.said.toLowerCase() !== c.correct.toLowerCase() ? c.said : undefined,
    note: c.note,
    source: "correction" as const,
  }));
}

export function truncateForDisplay(text: string, max = 100): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function countSatzbauEligible(corrections: CallCorrection[]): number {
  return corrections.filter(c => isSatzbauEligible(c.correct)).length;
}
