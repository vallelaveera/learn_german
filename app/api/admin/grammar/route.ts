import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  GRAMMAR_CATEGORIES,
  VERIFIED_LEVELS,
  getCategoryBlock,
  getTierItems,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { buildGrammarCoverageReport, tierBlockKey } from "@/lib/grammar/coverage";
import { loadAllExtraCounts } from "@/lib/grammar/curriculum-kv";
import { getMergedExercises } from "@/lib/grammar/merge-block";
import { previewGrammarExercises, saveGrammarExercises } from "@/lib/grammar/enrichment";

export const runtime = "nodejs";

function parseLevel(value: unknown): VerifiedLevel | null {
  return typeof value === "string" && (VERIFIED_LEVELS as string[]).includes(value)
    ? (value as VerifiedLevel)
    : null;
}

function parseCategory(value: unknown): GrammarCategory | null {
  return typeof value === "string" && (GRAMMAR_CATEGORIES as string[]).includes(value)
    ? (value as GrammarCategory)
    : null;
}

function parseTier(value: unknown): GrammarTier {
  return value === "advanced" ? "advanced" : "basic";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const level = parseLevel(req.nextUrl.searchParams.get("level"));
  const category = parseCategory(req.nextUrl.searchParams.get("category"));
  const tier = parseTier(req.nextUrl.searchParams.get("tier"));
  const extraCounts = await loadAllExtraCounts();
  const report = buildGrammarCoverageReport(extraCounts);

  if (level && category) {
    const block = getCategoryBlock(level, category);
    const merged = await getMergedExercises(level, category, tier);
    return NextResponse.json({
      report,
      block: {
        level,
        category,
        tier,
        theory: getTierItems(level, category, tier),
        theoryOther: getTierItems(level, category, tier === "basic" ? "advanced" : "basic"),
        typicalMistakes: block.typicalMistakes,
        exercises: merged.exercises,
        baseCount: merged.baseCount,
        extraCount: merged.extraCount,
        appCoverage: block.appCoverage,
        key: tierBlockKey(level, category, tier),
      },
    });
  }

  return NextResponse.json({ report });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const level = parseLevel(body.level);
    const category = parseCategory(body.category);
    const tier = parseTier(body.tier);
    const action = body.action === "save" ? "save" : "preview";
    const count = typeof body.count === "number" ? body.count : 5;

    if (!level || !category) {
      return NextResponse.json({ error: "Invalid level or category" }, { status: 400 });
    }
    if (count < 1 || count > 10) {
      return NextResponse.json({ error: "count must be between 1 and 10" }, { status: 400 });
    }

    if (action === "save") {
      const exercises = Array.isArray(body.exercises)
        ? body.exercises.filter((s: unknown): s is string => typeof s === "string")
        : [];
      if (!exercises.length) {
        return NextResponse.json({ error: "exercises array required for save" }, { status: 400 });
      }
      const result = await saveGrammarExercises({ level, category, tier, exercises });
      return NextResponse.json({ action, ...result });
    }

    const result = await previewGrammarExercises({ level, category, tier, count });
    return NextResponse.json({ action, ...result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
