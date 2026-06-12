import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getVocab, updateVocabStatus } from "@/lib/kv";
import { filterUnifiedWords, loadUnifiedWords } from "@/lib/vocab/load";
import type { CEFRLevel } from "@/lib/vocab/types";
import { getStatusFromScore } from "@/lib/vocab/iconColors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action");
    const unified = await loadUnifiedWords();

    if (action === "filter") {
      const level = req.nextUrl.searchParams.get("level") as CEFRLevel | null;
      const category = req.nextUrl.searchParams.get("category");
      const words = await filterUnifiedWords({
        level: level ?? undefined,
        category: category ?? undefined,
      });
      return NextResponse.json({ words });
    }

    if (unified.length > 0) {
      return NextResponse.json({ words: unified });
    }

    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ words: [] });
    const words = await getVocab(user.userId);
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json({ words: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      action?: string;
      wordId?: string;
      correct?: boolean;
    };

    if (body.action !== "updateStatus") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!body.wordId || typeof body.correct !== "boolean") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const word = await updateVocabStatus(user.userId, body.wordId, body.correct);
    if (!word) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const status = getStatusFromScore(word.timesSeen, word.correctCount ?? 0);

    return NextResponse.json({ word, status });
  } catch (e) {
    console.error("Vocab PATCH failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
