/**
 * Print verified German examples counts (definition-of-done check).
 * Run: npx ts-node -P scripts/tsconfig.json scripts/verify-german-examples-import.ts
 */

import { GRAMMAR_CATEGORIES, VERIFIED_LEVELS } from "../lib/grammar/verified-curriculum";
import { countVerifiedExamplesByBlock } from "../lib/grammar/verified-examples";

const EXPECTED: Record<string, number> = {
  "A1|derDieDas": 280,
  "A1|cases": 113,
  "A1|tenses": 302,
  "A1|prepositions": 85,
  "A2|derDieDas": 128,
  "A2|cases": 93,
  "A2|tenses": 195,
  "A2|prepositions": 92,
  "B1|derDieDas": 80,
  "B1|cases": 112,
  "B1|tenses": 311,
  "B1|prepositions": 125,
  "B2|derDieDas": 87,
  "B2|cases": 100,
  "B2|tenses": 119,
  "B2|prepositions": 76,
  "C1|derDieDas": 45,
  "C1|cases": 61,
  "C1|tenses": 100,
  "C1|prepositions": 86,
  TOTAL: 2590,
};

function padRight(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function main(): void {
  const counts = countVerifiedExamplesByBlock();
  const mismatches: string[] = [];

  console.log("level | category     | count");
  for (const level of VERIFIED_LEVELS) {
    for (const category of GRAMMAR_CATEGORIES) {
      const key = `${level}|${category}`;
      const count = counts[key] ?? 0;
      const expected = EXPECTED[key];
      console.log(`${padRight(level, 5)} | ${padRight(category, 12)} | ${count}`);
      if (expected != null && count !== expected) {
        mismatches.push(`${key}: got ${count}, expected ${expected}`);
      }
    }
  }

  const total = counts.TOTAL ?? 0;
  console.log(`${padRight("TOTAL", 5)} | ${padRight("", 12)} | ${total}`);
  if (total !== EXPECTED.TOTAL) {
    mismatches.push(`TOTAL: got ${total}, expected ${EXPECTED.TOTAL}`);
  }

  if (mismatches.length) {
    console.error("\nCOUNT MISMATCH:");
    mismatches.forEach(m => console.error(`  - ${m}`));
    process.exit(1);
  }

  console.log("\nAll counts match expected totals.");
}

main();
