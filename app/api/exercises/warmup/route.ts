import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { saveExerciseResults } from "@/lib/kv";
import { selectWarmupCards } from "@/lib/exercises/select";
import { parseWordCategory } from "@/lib/exercises/categories";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const category = parseWordCategory(req.nextUrl.searchParams.get("category"));
    const scenario = req.nextUrl.searchParams.get("scenario");
    const cards = await selectWarmupCards(user.userId, user, 5, category, scenario);
    return NextResponse.json({ cards });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { results } = await req.json() as {
      results: { itemId: string; german: string; correct: boolean }[];
    };
    if (results?.length) {
      await saveExerciseResults(
        user.userId,
        results.map(r => ({ ...r, type: "warmup" as const, ts: Date.now() }))
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
