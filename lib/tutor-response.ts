import type { Message } from "./types";

export interface ParsedTutorResponse {
  german: string;
  hint?: string;
  correction?: string;
}

const HINT_PREFIX = "💡";

export function parseTutorResponse(fullText: string): ParsedTutorResponse {
  const allLines = fullText.split("\n").filter(Boolean);
  const speechLines = allLines.filter(l => !l.startsWith(HINT_PREFIX));
  const german = speechLines.join(" ").trim();

  const hintLines = allLines
    .filter(l => l.startsWith(HINT_PREFIX))
    .map(l => l.replace(/^💡\s*/, "").trim())
    .filter(Boolean);

  const correctionLine = hintLines.find(h => /^Korrektur:/i.test(h));
  const correction = correctionLine
    ? correctionLine.replace(/^Korrektur:\s*/i, "").trim()
    : undefined;

  const otherHints = hintLines.filter(h => !/^Korrektur:/i.test(h));
  const hint = otherHints.length
    ? otherHints.filter((h, i) => otherHints.indexOf(h) === i).join(" · ")
    : undefined;

  return { german, hint, correction };
}

export function attachCorrectionToLastUser(
  messages: Message[],
  correction: string,
): Message[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return [
        ...messages.slice(0, i),
        { ...messages[i], correction },
        ...messages.slice(i + 1),
      ];
    }
  }
  return messages;
}
