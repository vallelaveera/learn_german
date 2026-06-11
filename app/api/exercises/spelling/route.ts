import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { saveExerciseResults } from "@/lib/kv";
import { selectSpellingItems, spellingMatches } from "@/lib/exercises/spelling";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await selectSpellingItems(user, 5);
    return NextResponse.json({ items });
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
      results: { itemId: string; german: string; answer: string; input: string }[];
    };

    const graded = (results ?? []).map(r => ({
      itemId: r.itemId,
      german: r.german,
      correct: spellingMatches(r.answer, r.input),
      type: "spelling" as const,
      ts: Date.now(),
    }));

    if (graded.length) await saveExerciseResults(user.userId, graded);

    return NextResponse.json({
      ok: true,
      score: graded.filter(g => g.correct).length,
      total: graded.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
