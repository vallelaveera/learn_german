/**
 * Single-word vocabulary import pipeline test.
 * Run: npx ts-node -P scripts/tsconfig.json scripts/test-vocab-import.ts
 */

import * as fs from "fs";
import * as path from "path";
import type { ImportWordInput, UnifiedWord } from "../lib/vocab/types";

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env.local"));
loadEnvFile(path.join(__dirname, "..", ".env"));

const TEST_WORD: ImportWordInput = {
  id: "w-a1-001",
  text: "das Wasser",
  article: "das",
  base: "Wasser",
  translation: "water",
  level: "A1",
  category: "food",
  type: "noun",
  plural: "die Wässer",
  example: "Ich trinke Wasser.",
  priority: "high",
};

const FIELD_CHECKS: (keyof UnifiedWord)[] = [
  "id",
  "text",
  "translation",
  "level",
  "category",
  "article",
  "base",
  "plural",
  "example",
  "priority",
];

function passFail(label: string, ok: boolean): void {
  console.log(`${label}: ${ok ? "PASS" : "FAIL"}`);
}

async function main(): Promise<void> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error("Missing KV_REST_API_URL or KV_REST_API_TOKEN in environment.");
    process.exit(1);
  }

  const { Redis } = await import("@upstash/redis");
  const { saveWords, getUnifiedWordById } = await import("../lib/vocab/save");
  const { filterUnifiedWords, loadUnifiedWords } = await import("../lib/vocab/load");
  const { cleanWordKey, getOrGenerateIcon } = await import("../lib/vocab/icons");

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  console.log("=== CHECK 2 — Storage test (first save) ===");
  const savedIds = await saveWords([TEST_WORD]);
  console.log("saveWords returned ids:", savedIds);

  const stored = await getUnifiedWordById(TEST_WORD.id!);
  console.log("\nStored object:");
  console.log(JSON.stringify(stored, null, 2));

  console.log("\nField checks:");
  for (const field of FIELD_CHECKS) {
    const ok = stored != null && stored[field] !== undefined && stored[field] !== "";
    passFail(String(field), ok);
  }

  console.log("\n=== CHECK 4 — Dedup test (second save) ===");
  const countBefore = stored?.seenCount ?? 0;
  let dedupError: string | null = null;
  try {
    const secondSave = await saveWords([TEST_WORD]);
    console.log("Second saveWords returned ids:", secondSave);
  } catch (err) {
    dedupError = err instanceof Error ? err.message : String(err);
    console.error("Dedup threw:", dedupError);
  }

  const afterDedup = await getUnifiedWordById(TEST_WORD.id!);
  const allWords = await loadUnifiedWords();
  const wasserMatches = allWords.filter(w => w.text.toLowerCase() === "das wasser");

  passFail("No error thrown on second save", dedupError === null);
  passFail("No duplicate created", wasserMatches.length === 1);
  passFail("seenCount incremented", (afterDedup?.seenCount ?? 0) === countBefore + 1);
  console.log(`seenCount: ${countBefore} → ${afterDedup?.seenCount}`);

  console.log("\n=== CHECK 5 — Retrieval test (lib + HTTP) ===");
  const list = await loadUnifiedWords();
  console.log("loadUnifiedWords:", JSON.stringify(list, null, 2));

  const byLevel = await filterUnifiedWords({ level: "A1" });
  console.log("filter level=A1:", JSON.stringify(byLevel, null, 2));

  const byCategory = await filterUnifiedWords({ category: "food" });
  console.log("filter category=food:", JSON.stringify(byCategory, null, 2));

  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  for (const url of [
    `${baseUrl}/api/vocab`,
    `${baseUrl}/api/vocab?action=filter&level=A1`,
    `${baseUrl}/api/vocab?action=filter&category=food`,
  ]) {
    try {
      const res = await fetch(url);
      const body = await res.json();
      console.log(`\nGET ${url}`);
      console.log(JSON.stringify(body, null, 2));
    } catch (err) {
      console.log(`\nGET ${url} — skipped (${err instanceof Error ? err.message : err})`);
    }
  }

  console.log("\n=== CHECK 6 — Icon generation test ===");
  await getOrGenerateIcon(TEST_WORD.text, TEST_WORD.translation);
  const iconKey = cleanWordKey(TEST_WORD.text);
  const iconSvg = await redis.get<string>(`uv:icon:${iconKey}`);
  const hasIcon = typeof iconSvg === "string" && iconSvg.trim().startsWith("<svg");
  passFail(`Redis uv:icon:${iconKey}`, hasIcon);

  try {
    const iconUrl = `${baseUrl}/api/icons/${encodeURIComponent(TEST_WORD.text)}`;
    const iconRes = await fetch(iconUrl);
    const iconBody = await iconRes.text();
    const validSvg = iconRes.ok && iconBody.trim().startsWith("<svg");
    passFail(`GET ${iconUrl}`, validSvg);
    if (validSvg) {
      console.log("SVG preview:", iconBody.slice(0, 120) + "...");
    }
  } catch (err) {
    console.log(`Icon HTTP test skipped (${err instanceof Error ? err.message : err})`);
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
