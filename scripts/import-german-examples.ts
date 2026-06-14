/**
 * Validate verified German examples JSON and write subcategory index.
 * Run: npx ts-node -P scripts/tsconfig.json scripts/import-german-examples.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
  GRAMMAR_CATEGORIES,
  VERIFIED_LEVELS,
  type GrammarCategory,
  type VerifiedLevel,
} from "../lib/grammar/verified-curriculum";
import { buildSubcategoryIndex, countVerifiedExamplesByBlock } from "../lib/grammar/verified-examples";
import { transformExample } from "../lib/grammar/example-to-spec";
import type { VerifiedExamplesFile } from "../lib/grammar/verified-example-types";

const DATA_PATH = path.join(__dirname, "..", "public", "data", "german_examples_verified.json");
const INDEX_PATH = path.join(__dirname, "..", "public", "data", "german_examples_index.json");

function padRight(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function printCountTable(counts: Record<string, number>): void {
  console.log("\nlevel | category     | count");
  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      const key = `${level}|${category}`;
      console.log(`${padRight(level, 5)} | ${padRight(category, 12)} | ${counts[key] ?? 0}`);
    }
  }
  console.log(`${padRight("TOTAL", 5)} | ${padRight("", 12)} | ${counts.TOTAL ?? 0}`);
}

function validateStructure(data: VerifiedExamplesFile): string[] {
  const errors: string[] = [];

  if (!data.examples) {
    errors.push("Missing top-level `examples` object.");
    return errors;
  }

  for (const level of VERIFIED_LEVELS) {
    if (!data.examples[level]) {
      errors.push(`Missing level block: ${level}`);
      continue;
    }
    for (const category of GRAMMAR_CATEGORIES) {
      const entries = data.examples[level][category];
      if (!Array.isArray(entries)) {
        errors.push(`Missing or invalid array: examples.${level}.${category}`);
      }
    }
  }

  return errors;
}

function validateTransforms(data: VerifiedExamplesFile): string[] {
  const errors: string[] = [];
  let skipped = 0;

  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      const entries = data.examples[level]?.[category] ?? [];
      entries.forEach((entry, sourceIndex) => {
        const transformed = transformExample(entry, sourceIndex);
        if (!transformed) {
          skipped += 1;
          if (entry.exercise_type !== "drag_sort") {
            errors.push(
              `Untransformable ${level}.${category}[${sourceIndex}] type=${entry.exercise_type}`,
            );
          }
        } else if (!transformed.meta.explanation && entry.note?.trim()) {
          errors.push(`Missing explanation meta for ${level}.${category}[${sourceIndex}]`);
        }
      });
    }
  }

  if (skipped) {
    console.log(`\nSkipped ${skipped} entries (drag_sort / empty).`);
  }

  return errors;
}

function main(): void {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Missing data file: ${DATA_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const data = JSON.parse(raw) as VerifiedExamplesFile;

  const structureErrors = validateStructure(data);
  if (structureErrors.length) {
    console.error("Structure validation failed:");
    structureErrors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  const counts = countVerifiedExamplesByBlock();
  printCountTable(counts);

  const metaTotal = data._meta?.total_examples;
  if (metaTotal != null && metaTotal !== counts.TOTAL) {
    console.warn(`\nWarning: _meta.total_examples (${metaTotal}) != counted TOTAL (${counts.TOTAL})`);
  }

  const transformErrors = validateTransforms(data);
  if (transformErrors.length) {
    console.error("\nTransform validation failed:");
    transformErrors.slice(0, 20).forEach(e => console.error(`  - ${e}`));
    if (transformErrors.length > 20) {
      console.error(`  ... and ${transformErrors.length - 20} more`);
    }
    process.exit(1);
  }

  const index = buildSubcategoryIndex();
  fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  let subcategoryKeys = 0;
  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      subcategoryKeys += Object.keys(index[level]?.[category] ?? {}).length;
    }
  }

  console.log(`\nWrote ${INDEX_PATH}`);
  console.log(`Subcategory keys: ${subcategoryKeys}`);
  console.log("Import validation OK.");
}

main();
