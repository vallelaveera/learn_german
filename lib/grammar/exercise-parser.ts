export type ExerciseKind =
  | "flashcard"
  | "fill-blank"
  | "drag-sort"
  | "sentence-build"
  | "multiple-choice"
  | "unknown";

export interface ParsedExercise {
  kind: ExerciseKind;
  raw: string;
  prompt: string;
  answer: string;
  options?: string[];
  tokens?: string[];
  contextFlag?: boolean;
  /** Grammar rule explanation (from verified example `note`). */
  explanation?: string;
  /** Full German sentence for context-flag exercises. */
  contextSentence?: string;
  /** Banner text for context-flag exercises. */
  contextNote?: string;
}

const TYPE_PREFIX = /^(FLASHCARD|FILL-BLANK|DRAG-SORT|SENTENCE-BUILD|MULTIPLE-CHOICE):\s*/i;

function mapKind(label: string): ExerciseKind {
  const k = label.toUpperCase();
  if (k === "FLASHCARD") return "flashcard";
  if (k === "FILL-BLANK") return "fill-blank";
  if (k === "DRAG-SORT") return "drag-sort";
  if (k === "SENTENCE-BUILD") return "sentence-build";
  if (k === "MULTIPLE-CHOICE") return "multiple-choice";
  return "unknown";
}

/** Parse exercise spec strings from verified curriculum JSON. */
export function parseExerciseSpec(raw: string): ParsedExercise {
  const contextFlag = raw.includes("⚠️") || raw.includes("CONTEXT FLAG");
  const cleaned = raw.replace(/⚠️\s*CONTEXT FLAG?/gi, "").trim();
  const match = cleaned.match(TYPE_PREFIX);
  const kind = match ? mapKind(match[1]!) : "unknown";
  const body = match ? cleaned.slice(match[0].length).trim() : cleaned;

  const arrow = body.match(/^'([^']*)'\s*→\s*'([^']*)'$/);
  if (arrow) {
    return {
      kind,
      raw,
      prompt: arrow[1]!.trim(),
      answer: arrow[2]!.trim(),
      contextFlag,
    };
  }

  const mc = body.match(/^'([^']*)'\s*→\s*'([^']*)'\s*\(options:\s*(.+)\)$/i);
  if (mc) {
    const options = mc[3]!
      .split(",")
      .map(o => o.trim())
      .filter(Boolean);
    return {
      kind: kind === "unknown" ? "multiple-choice" : kind,
      raw,
      prompt: mc[1]!.trim(),
      answer: mc[2]!.trim(),
      options,
      contextFlag,
    };
  }

  const tokens = body.match(/^'([^']*)'\s*→\s*\[(.+)\]$/);
  if (tokens) {
    return {
      kind: kind === "unknown" ? "sentence-build" : kind,
      raw,
      prompt: tokens[1]!.trim(),
      answer: tokens[1]!.trim(),
      tokens: tokens[2]!.split("/").map(t => t.trim()).filter(Boolean),
      contextFlag,
    };
  }

  return { kind, raw, prompt: body, answer: "", contextFlag };
}

export function normalizeAnswer(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
}

export function answersMatch(given: string, expected: string): boolean {
  const g = normalizeAnswer(given);
  const e = normalizeAnswer(expected);
  if (g === e) return true;
  const alts = expected.split(/\s*\/\s*/).map(normalizeAnswer);
  if (alts.includes(g)) return true;
  if (expected.includes("/")) {
    const joined = normalizeAnswer(alts.join(" "));
    if (g === joined) return true;
  }
  return false;
}
