import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getSessionCorrections,
  getUnpracticedCorrections,
  markCorrectionsPracticed,
  saveExerciseResults,
} from "@/lib/kv";
import { buildCallSentenceExercises } from "@/lib/exercises/call-sentences";
import { selectSentenceExercises, shuffleWords } from "@/lib/exercises/sentences";
import { parseSentenceCategory } from "@/lib/exercises/categories";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const source = req.nextUrl.searchParams.get("source");
    if (source === "call") {
      const sessionId = req.nextUrl.searchParams.get("session");
      const corrections = sessionId
        ? (await getSessionCorrections(user.userId, sessionId)).filter(c => !c.practiced)
        : await getUnpracticedCorrections(user.userId, 5);
      const exercises = buildCallSentenceExercises(corrections);
      return NextResponse.json({ exercises, source: "call" });
    }

    const sentences = await selectSentenceExercises(
      user.userId,
      user,
      5,
      parseSentenceCategory(req.nextUrl.searchParams.get("category")),
    );
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

    const { results, practicedCorrectionIds } = await req.json() as {
      results: { itemId: string; german: string; correct: boolean }[];
      practicedCorrectionIds?: string[];
    };
    if (results?.length) {
      await saveExerciseResults(
        user.userId,
        results.map(r => ({ ...r, type: "sentence" as const, ts: Date.now() }))
      );
    }
    if (practicedCorrectionIds?.length) {
      await markCorrectionsPracticed(user.userId, practicedCorrectionIds);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
