/**
 * Batch-generate animated sentence illustration SVGs via Claude Haiku.
 * Run: npm run generate:svgs -- --test
 * Run: npm run generate:svgs -- --category=food
 * Run: npm run generate:svgs:retry
 */

import * as fs from "fs";
import * as path from "path";
import { BATCH_CATEGORIES } from "../lib/content/illustration-batch";

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

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const { runIllustrationBatchForCategory, ILLUSTRATION_BATCH_LIMIT } = await import("../lib/content/illustration-batch");
  const { ensureLocalDir } = await import("../lib/content/illustration-storage");
  ensureLocalDir();

  const testMode = process.argv.includes("--test");
  const retryMode = process.argv.includes("--retry");
  const categoryArg = process.argv.find(a => a.startsWith("--category="))?.split("=")[1];

  let categories = categoryArg
    ? BATCH_CATEGORIES.filter(c => c.id === categoryArg)
    : testMode
      ? [BATCH_CATEGORIES[0]]
      : BATCH_CATEGORIES;

  if (categoryArg && categories.length === 0) {
    console.error("Unknown category:", categoryArg);
    process.exit(1);
  }

  if (testMode) console.log("TEST MODE: first category only");
  if (retryMode) console.log("RETRY MODE: placeholders only");

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const allMode = process.argv.includes("--all");

  for (const cat of categories) {
    console.log(`\n=== ${cat.label} (${cat.id}) ===`);
    let round = 0;
    do {
      if (round > 0) console.log(`--- round ${round + 1} ---`);
      const result = await runIllustrationBatchForCategory(cat.id, {
        retryPlaceholders: retryMode,
        limit: ILLUSTRATION_BATCH_LIMIT,
      });
      for (const line of result.logs) console.log(line);
      totalGenerated += result.generated;
      totalSkipped += result.skipped;
      totalFailed += result.failed;
      round++;
      if (!allMode || !result.hasMore) break;
    } while (round < 50);
  }

  console.log("\n=== BATCH COMPLETE ===");
  console.log("Generated:", totalGenerated);
  console.log("Skipped (cached):", totalSkipped);
  console.log("Failed:", totalFailed);
  console.log("Total cost estimate: $" + (totalGenerated * 0.003).toFixed(3));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
