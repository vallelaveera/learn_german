import { NextRequest, NextResponse } from "next/server";
import {
  GRAMMAR_CATEGORIES,
  VERIFIED_LEVELS,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { getMergedExercises, getMergedLevelExercises } from "@/lib/grammar/merge-block";

export const runtime = "nodejs";

function parseLevel(value: string | null): VerifiedLevel | null {
  return value && (VERIFIED_LEVELS as string[]).includes(value) ? (value as VerifiedLevel) : null;
}

function parseCategory(value: string | null): GrammarCategory | null {
  return value && (GRAMMAR_CATEGORIES as string[]).includes(value)
    ? (value as GrammarCategory)
    : null;
}

function parseTier(value: string | null): GrammarTier {
  return value === "advanced" ? "advanced" : "basic";
}

export async function GET(req: NextRequest) {
  const level = parseLevel(req.nextUrl.searchParams.get("level"));
  const category = parseCategory(req.nextUrl.searchParams.get("category"));
  const tier = parseTier(req.nextUrl.searchParams.get("tier"));

  if (!level) {
    return NextResponse.json({ error: "level is required" }, { status: 400 });
  }

  try {
    if (category) {
      const block = await getMergedExercises(level, category, tier);
      return NextResponse.json({ level, category, ...block });
    }

    const blocks = await getMergedLevelExercises(level);
    return NextResponse.json({ level, blocks });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
