import verifiedExamplesData from "../../public/data/german_examples_verified.json";
import {
  GRAMMAR_CATEGORIES,
  VERIFIED_LEVELS,
  getBaseTierExercises,
  getCategoryBlock,
  type GrammarCategory,
  type VerifiedLevel,
} from "./verified-curriculum";
import { buildDedupeKey, transformExample } from "./example-to-spec";
import { clearExerciseMetaRegistry, registerExerciseMeta } from "./exercise-meta";
import type {
  SubcategoryIndex,
  VerifiedExamplesFile,
  VerifiedGrammarExample,
} from "./verified-example-types";

export const VERIFIED_EXAMPLES = verifiedExamplesData as VerifiedExamplesFile;

let registryBuilt = false;

function normalizeSpecKey(spec: string): string {
  return spec.trim().toLowerCase();
}

function collectBaseDedupeKeys(): Set<string> {
  const keys = new Set<string>();
  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      const block = getCategoryBlock(level, category);
      for (const tier of ["basic", "advanced"] as const) {
        for (const spec of getBaseTierExercises(block, tier)) {
          keys.add(normalizeSpecKey(spec));
        }
      }
    }
  }
  return keys;
}

function ensureRegistryBuilt(): void {
  if (registryBuilt) return;

  clearExerciseMetaRegistry();
  const baseSpecKeys = collectBaseDedupeKeys();
  const seenImportKeys = new Set<string>();

  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      const entries = VERIFIED_EXAMPLES.examples[level]?.[category] ?? [];
      entries.forEach((entry, sourceIndex) => {
        const transformed = transformExample(entry, sourceIndex);
        if (!transformed) return;

        if (baseSpecKeys.has(normalizeSpecKey(transformed.spec))) return;
        if (seenImportKeys.has(transformed.dedupeKey)) return;

        seenImportKeys.add(transformed.dedupeKey);
        registerExerciseMeta(transformed.spec, transformed.meta);
      });
    }
  }

  registryBuilt = true;
}

/** Populate exercise meta registry (client + server). Safe to call repeatedly. */
export function warmVerifiedExamplesMetaRegistry(): void {
  ensureRegistryBuilt();
}

export function getVerifiedExamplesForBlock(
  level: VerifiedLevel,
  category: GrammarCategory,
): string[] {
  ensureRegistryBuilt();

  const baseSpecKeys = collectBaseDedupeKeys();
  const seenImportKeys = new Set<string>();
  const specs: string[] = [];
  const entries = VERIFIED_EXAMPLES.examples[level]?.[category] ?? [];

  entries.forEach((entry, sourceIndex) => {
    const transformed = transformExample(entry, sourceIndex);
    if (!transformed) return;
    if (baseSpecKeys.has(normalizeSpecKey(transformed.spec))) return;
    if (seenImportKeys.has(transformed.dedupeKey)) return;

    seenImportKeys.add(transformed.dedupeKey);
    specs.push(transformed.spec);
    registerExerciseMeta(transformed.spec, transformed.meta);
  });

  return specs;
}

export function countVerifiedExamplesByBlock(): Record<string, number> {
  const out: Record<string, number> = {};
  let total = 0;

  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      const key = `${level}|${category}`;
      const count = VERIFIED_EXAMPLES.examples[level]?.[category]?.length ?? 0;
      out[key] = count;
      total += count;
    }
  }

  out.TOTAL = total;
  return out;
}

export function buildSubcategoryIndex(): SubcategoryIndex {
  const index = {} as SubcategoryIndex;

  for (const level of VERIFIED_LEVELS) {
    index[level] = {};
    for (const category of GRAMMAR_CATEGORIES) {
      const entries = VERIFIED_EXAMPLES.examples[level]?.[category] ?? [];
      const bySub: Record<string, number[]> = {};

      entries.forEach((entry: VerifiedGrammarExample, sourceIndex: number) => {
        const sub = entry.subcategory?.trim();
        if (!sub) return;
        if (!bySub[sub]) bySub[sub] = [];
        bySub[sub].push(sourceIndex);
      });

      if (Object.keys(bySub).length) {
        index[level]![category] = bySub;
      }
    }
  }

  return index;
}

export function getVerifiedExamplesEntries(
  level: VerifiedLevel,
  category: GrammarCategory,
): VerifiedGrammarExample[] {
  return VERIFIED_EXAMPLES.examples[level]?.[category] ?? [];
}

/** Reset cached registry (tests / re-import). */
export function resetVerifiedExamplesCache(): void {
  registryBuilt = false;
  clearExerciseMetaRegistry();
}
