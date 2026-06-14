import type { ExerciseMeta, TransformedExample, VerifiedGrammarExample } from "./verified-example-types";

const ARTICLE_ANSWERS = new Set([
  "der", "die", "das", "den", "dem", "des",
  "ein", "eine", "einen", "einem", "einer", "eines",
  "kein", "keine", "keinen", "keinem", "keiner", "keines",
]);

export function isArticleAnswer(answer: string | undefined): boolean {
  if (!answer) return false;
  return ARTICLE_ANSWERS.has(answer.trim().toLowerCase());
}

function escapeSpecFragment(text: string): string {
  return text.replace(/'/g, "\\'");
}

function formatSpec(kind: string, prompt: string, answer: string, options?: string[]): string {
  const p = escapeSpecFragment(prompt);
  const a = escapeSpecFragment(answer);
  if (options?.length) {
    const opts = options.map(o => escapeSpecFragment(o)).join(", ");
    return `${kind}: '${p}' → '${a}' (options: ${opts})`;
  }
  return `${kind}: '${p}' → '${a}'`;
}

function articleMultipleChoiceOptions(answer: string): string[] {
  const a = answer.trim();
  const lower = a.toLowerCase();

  if (["der", "die", "das"].includes(lower)) {
    return ["der", "die", "das"];
  }
  if (lower === "den") return ["den", "die", "das"];
  if (lower === "dem") return ["dem", "der", "den"];
  if (lower === "des") return ["des", "der", "dem"];
  if (["ein", "eine", "einen"].includes(lower)) {
    return ["ein", "eine", "einen"];
  }
  if (["einem", "einer", "eines"].includes(lower)) {
    return ["einem", "einer", "eines"];
  }
  if (["kein", "keine", "keinen"].includes(lower)) {
    return ["kein", "keine", "keinen"];
  }
  if (["keinem", "keiner", "keines"].includes(lower)) {
    return ["keinem", "keiner", "keines"];
  }

  return [a, "der", "die"];
}

function joinAnswers(entry: VerifiedGrammarExample): string {
  if (entry.answers?.length) {
    return entry.answers.map(a => a.trim()).join(" / ");
  }
  return (entry.answer ?? "").trim();
}

export function buildDedupeKey(entry: VerifiedGrammarExample): string {
  const stem = (
    entry.de_blank ??
    entry.de ??
    entry.de_correct ??
    entry.de_wrong?.replace(/^\*/, "") ??
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const ans = joinAnswers(entry).toLowerCase();
  const type = entry.exercise_type ?? "fill_blank";
  return `${type}|${stem}|${ans}`;
}

function baseMeta(entry: VerifiedGrammarExample, sourceIndex: number): ExerciseMeta {
  return {
    explanation: entry.note?.trim() || undefined,
    contextSentence: entry.context_flag ? entry.de?.trim() : undefined,
    contextNote: entry.context_note?.trim() || undefined,
    subcategory: entry.subcategory?.trim() || undefined,
    sourceIndex,
  };
}

function transformRecognize(entry: VerifiedGrammarExample, sourceIndex: number): TransformedExample {
  const answer = (entry.answer ?? "").trim();
  const prompt = (entry.de ?? entry.en ?? "").trim();
  const meta = baseMeta(entry, sourceIndex);

  if (isArticleAnswer(answer)) {
    const options = articleMultipleChoiceOptions(answer);
    const spec = formatSpec("MULTIPLE-CHOICE", prompt || "Artikel wählen", answer, options);
    return { spec, meta, dedupeKey: buildDedupeKey(entry) };
  }

  const en = (entry.en ?? answer).trim();
  const spec = formatSpec("FLASHCARD", prompt, en);
  return { spec, meta, dedupeKey: buildDedupeKey(entry) };
}

function transformFillBlank(entry: VerifiedGrammarExample, sourceIndex: number): TransformedExample {
  const prompt = (entry.de_blank ?? entry.de ?? "").trim();
  const answer = joinAnswers(entry);
  const meta = baseMeta(entry, sourceIndex);
  const prefix = entry.context_flag ? "⚠️ CONTEXT FLAG: " : "";
  const spec = formatSpec("FILL-BLANK", `${prefix}${prompt}`, answer);
  return { spec, meta, dedupeKey: buildDedupeKey(entry) };
}

function transformErrorCorrect(entry: VerifiedGrammarExample, sourceIndex: number): TransformedExample {
  const wrong = (entry.de_wrong ?? "").replace(/^\*/, "").trim();
  const correct = (entry.de_correct ?? "").trim();
  const meta = baseMeta(entry, sourceIndex);
  const spec = formatSpec(
    "MULTIPLE-CHOICE",
    "Welcher Satz ist richtig?",
    correct,
    [correct, wrong],
  );
  return { spec, meta, dedupeKey: buildDedupeKey(entry) };
}

/** Transform one verified JSON entry into an app exercise spec + metadata. */
export function transformExample(
  entry: VerifiedGrammarExample,
  sourceIndex: number,
): TransformedExample | null {
  const type = entry.exercise_type;

  if (type === "recognize") {
    if (!entry.de && !entry.en) return null;
    return transformRecognize(entry, sourceIndex);
  }

  if (type === "error_correct") {
    if (!entry.de_correct || !entry.de_wrong) return null;
    return transformErrorCorrect(entry, sourceIndex);
  }

  if (type === "fill_blank") {
    if (!entry.de_blank && !entry.de) return null;
    if (!entry.answer && !entry.answers?.length) return null;
    return transformFillBlank(entry, sourceIndex);
  }

  if (type === "drag_sort") {
    return null;
  }

  return null;
}
