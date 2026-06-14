import { parseJsonArray } from "@/lib/content/generate";
import { callAdminLlm, type AdminLlmProvider } from "@/lib/content/llm-provider";
import type { GrammarCategory, GrammarTier, VerifiedLevel } from "./verified-curriculum";
import { getMergedExercises, mergeExerciseLists } from "./merge-block";
import { appendExtraExercises, loadExtraExercises } from "./curriculum-kv";
import { getBaseTierExercises, getCategoryBlock } from "./verified-curriculum";
import { parseExerciseSpec } from "./exercise-parser";
import {
  GRAMMAR_ENRICHMENT_SYSTEM,
  buildGrammarEnrichmentUserPrompt,
} from "./enrichment-prompt";

export interface GrammarEnrichmentResult {
  requested: number;
  generated: number;
  passed: string[];
  rejected: { spec: string; issues: string[] }[];
  saved?: number;
  totalExtra?: number;
  tier?: GrammarTier;
  provider?: AdminLlmProvider;
}

function validateExerciseSpec(spec: string): { ok: true } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  const trimmed = spec.trim();
  if (!trimmed) {
    return { ok: false, issues: ["empty spec"] };
  }
  const parsed = parseExerciseSpec(trimmed);
  if (parsed.kind === "unknown") {
    issues.push("unrecognized exercise type prefix");
  }
  if (!parsed.prompt) {
    issues.push("missing prompt");
  }
  if (parsed.kind !== "flashcard" && !parsed.answer) {
    issues.push("missing answer");
  }
  if (parsed.kind === "multiple-choice" && (!parsed.options || parsed.options.length < 2)) {
    issues.push("multiple-choice needs at least 2 options");
  }
  if (parsed.kind === "sentence-build" && (!parsed.tokens || parsed.tokens.length < 2)) {
    issues.push("sentence-build needs tokens");
  }
  return issues.length ? { ok: false, issues } : { ok: true };
}

function normalizeStem(spec: string): string {
  const parsed = parseExerciseSpec(spec);
  return parsed.prompt.replace(/\s+/g, " ").trim().toLowerCase();
}

function isDuplicateStem(spec: string, existing: string[]): boolean {
  const stem = normalizeStem(spec);
  return existing.some(e => normalizeStem(e) === stem);
}

export async function previewGrammarExercises(params: {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  count: number;
  provider?: AdminLlmProvider;
}): Promise<GrammarEnrichmentResult> {
  const count = Math.min(Math.max(params.count, 1), 10);
  const provider = params.provider ?? "claude";
  const { exercises: existing } = await getMergedExercises(params.level, params.category, params.tier);

  const userPrompt = buildGrammarEnrichmentUserPrompt({
    level: params.level,
    category: params.category,
    tier: params.tier,
    count,
    existingExercises: existing,
  });

  const raw = await callAdminLlm(provider, GRAMMAR_ENRICHMENT_SYSTEM, userPrompt, 4096);
  const generated = parseJsonArray<string>(raw) ?? [];
  const passed: string[] = [];
  const rejected: { spec: string; issues: string[] }[] = [];
  const seen = new Set(existing.map(s => s.trim()));
  const seenStems = existing.map(s => normalizeStem(s));

  for (const spec of generated) {
    if (typeof spec !== "string") continue;
    const trimmed = spec.trim();
    if (seen.has(trimmed)) {
      rejected.push({ spec: trimmed, issues: ["duplicate of existing exercise"] });
      continue;
    }
    if (isDuplicateStem(trimmed, [...seenStems, ...passed.map(normalizeStem)])) {
      rejected.push({ spec: trimmed, issues: ["duplicate sentence stem — needs more variety"] });
      continue;
    }
    const validation = validateExerciseSpec(trimmed);
    if (validation.ok) {
      passed.push(trimmed);
      seen.add(trimmed);
    } else {
      rejected.push({ spec: trimmed, issues: validation.issues });
    }
  }

  return {
    requested: count,
    generated: generated.length,
    passed,
    rejected,
    tier: params.tier,
    provider,
  };
}

export async function saveGrammarExercises(params: {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  exercises: string[];
}): Promise<GrammarEnrichmentResult> {
  const block = getCategoryBlock(params.level, params.category);
  const base = getBaseTierExercises(block, params.tier);
  const extras = await loadExtraExercises(params.level, params.category, params.tier);
  const existing = mergeExerciseLists(base, extras);

  const passed: string[] = [];
  const rejected: { spec: string; issues: string[] }[] = [];
  const seen = new Set(existing.map(s => s.trim()));

  for (const spec of params.exercises) {
    const trimmed = spec.trim();
    if (seen.has(trimmed)) {
      rejected.push({ spec: trimmed, issues: ["duplicate"] });
      continue;
    }
    if (isDuplicateStem(trimmed, existing)) {
      rejected.push({ spec: trimmed, issues: ["duplicate sentence stem"] });
      continue;
    }
    const validation = validateExerciseSpec(trimmed);
    if (!validation.ok) {
      rejected.push({ spec: trimmed, issues: validation.issues });
      continue;
    }
    passed.push(trimmed);
    seen.add(trimmed);
  }

  const { saved, total } = await appendExtraExercises(
    params.level,
    params.category,
    params.tier,
    passed,
  );

  return {
    requested: params.exercises.length,
    generated: params.exercises.length,
    passed,
    rejected,
    saved,
    totalExtra: total,
    tier: params.tier,
  };
}
