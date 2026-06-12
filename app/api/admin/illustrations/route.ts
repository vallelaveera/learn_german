import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  BATCH_CATEGORIES,
  getAllCategoryStats,
  getCategoryStats,
  getSentenceStatus,
  getSentencesByCategory,
  runIllustrationBatchForCategory,
} from "@/lib/content/illustration-batch";

export const runtime = "nodejs";
export const maxDuration = 300;

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 404 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = devOnly();
  if (blocked) return blocked;
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = req.nextUrl.searchParams.get("category");
  const categories = await getAllCategoryStats();

  if (!category) {
    return NextResponse.json({ categories, sentences: [] });
  }

  const sentences = getSentencesByCategory(category);
  const rows = await Promise.all(sentences.map(getSentenceStatus));
  const stats = await getCategoryStats(category);

  return NextResponse.json({
    categories,
    stats,
    sentences: rows,
    categoryMeta: BATCH_CATEGORIES.find(c => c.id === category) ?? null,
  });
}

export async function POST(req: NextRequest) {
  const blocked = devOnly();
  if (blocked) return blocked;
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as { category?: string; retry?: boolean };
    const category = body.category?.trim();

    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    if (!BATCH_CATEGORIES.some(c => c.id === category)) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }

    const result = await runIllustrationBatchForCategory(category, {
      retryPlaceholders: Boolean(body.retry),
    });

    const sentences = await Promise.all(
      getSentencesByCategory(category).map(getSentenceStatus),
    );
    const stats = await getCategoryStats(category);

    return NextResponse.json({ result, stats, sentences });
  } catch (e) {
    console.error("Admin illustrations POST failed:", e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
