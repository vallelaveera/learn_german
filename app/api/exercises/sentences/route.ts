import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { saveExerciseResults } from "@/lib/kv";
import { selectSentenceExercises, shuffleWords } from "@/lib/exercises/sentences";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sentences = await selectSentenceExercises(user.userId, user, 5);
    const exercises = sentences.map(s => ({
      ...s,
      chips: shuffleWords(s.words),
    }));
    return NextResponse.json({ exercises });
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
        results.map(r => ({ ...r, type: "sentence" as const, ts: Date.now() }))
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
