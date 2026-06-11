import type { Message } from "./types";
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

export function extractCorrectionsFromMessages(
  messages: Message[],
  sessionId: string,
): CallCorrection[] {
  const seen = new Set<string>();
  const out: CallCorrection[] = [];

  for (const msg of messages) {
    if (msg.role !== "user" || !msg.correction?.trim()) continue;
    const { correct, note } = parseCorrectionField(msg.correction);
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

export function countSatzbauEligible(corrections: CallCorrection[]): number {
  return corrections.filter(c => isSatzbauEligible(c.correct)).length;
}
