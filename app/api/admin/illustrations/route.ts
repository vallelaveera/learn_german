import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  BATCH_CATEGORIES,
  getAllCategoryStats,
  getAllWordCategoryStats,
  getCategoryStats,
  getSentenceStatus,
  getSentencesByCategory,
  getWordCategoryStats,
  getWordsByCategory,
  runIllustrationBatchForCategory,
  runWordIllustrationBatchForCategory,
  type IllustrationKind,
} from "@/lib/content/illustration-batch";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseKind(raw: string | null): IllustrationKind {
  return raw === "words" ? "words" : "sentences";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = req.nextUrl.searchParams.get("category");
  const kind = parseKind(req.nextUrl.searchParams.get("kind"));
  const categories =
    kind === "words" ? await getAllWordCategoryStats() : await getAllCategoryStats();

  if (!category) {
    return NextResponse.json({ kind, categories, sentences: [] });
  }

  const items =
    kind === "words" ? await getWordsByCategory(category) : await getSentencesByCategory(category);
  const rows = await Promise.all(items.map(getSentenceStatus));
  const stats =
    kind === "words" ? await getWordCategoryStats(category) : await getCategoryStats(category);

  return NextResponse.json({
    kind,
    categories,
    stats,
    sentences: rows,
    categoryMeta: BATCH_CATEGORIES.find(c => c.id === category) ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as { category?: string; retry?: boolean; limit?: number; kind?: IllustrationKind };
    const category = body.category?.trim();
    const kind = body.kind === "words" ? "words" : "sentences";
    const limit = body.limit ?? 10;

    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    if (!BATCH_CATEGORIES.some(c => c.id === category)) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }

    const result =
      kind === "words"
        ? await runWordIllustrationBatchForCategory(category, {
            retryPlaceholders: Boolean(body.retry),
            limit: Math.min(Math.max(limit, 1), 10),
          })
        : await runIllustrationBatchForCategory(category, {
            retryPlaceholders: Boolean(body.retry),
            limit: Math.min(Math.max(limit, 1), 10),
          });

    const items =
      kind === "words" ? await getWordsByCategory(category) : await getSentencesByCategory(category);
    const rows = await Promise.all(items.map(getSentenceStatus));
    const stats =
      kind === "words" ? await getWordCategoryStats(category) : await getCategoryStats(category);

    return NextResponse.json({
      kind,
      result,
      stats,
      sentences: rows,
      categories: kind === "words" ? await getAllWordCategoryStats() : await getAllCategoryStats(),
    });
  } catch (e) {
    console.error("Admin illustrations POST failed:", e);
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
