import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { completePlacement, isPlacementDone, saveExerciseResults } from "@/lib/kv";
import { getPlacementRound, levelFromPlacement, shouldAdvance } from "@/lib/exercises/placement";
import { normalizeGermanLevel } from "@/lib/levels";
import type { PlacementLevel } from "@/lib/exercises/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const done = await isPlacementDone(user.userId);
    const level = (req.nextUrl.searchParams.get("level") ?? "A1") as PlacementLevel;
    const round = getPlacementRound(level);

    return NextResponse.json({
      done,
      currentLevel: user.germanLevel,
      round,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      level: PlacementLevel;
      results: { itemId: string; german: string; correct: boolean }[];
      completedLevels?: PlacementLevel[];
      accuracies?: Partial<Record<PlacementLevel, number>>;
      skip?: boolean;
    };

    if (body.results?.length) {
      await saveExerciseResults(
        user.userId,
        body.results.map(r => ({ ...r, type: "placement" as const, ts: Date.now() }))
      );
    }

    if (body.skip) {
      await completePlacement(user.userId, "A1", 0);
      return NextResponse.json({ done: true, level: "A1", skipped: true });
    }

    const correct = body.results?.filter(r => r.correct).length ?? 0;
    const total = body.results?.length ?? 0;
    const accuracy = total ? correct / total : 0;

    const completed = [...(body.completedLevels ?? []), body.level];
    const accuracies = { ...(body.accuracies ?? {}), [body.level]: accuracy };

    const advance = shouldAdvance(body.level, accuracy);
    const nextLevel: PlacementLevel | null =
      body.level === "A1" ? "A2" : body.level === "A2" ? "B1" : null;

    if (advance && nextLevel) {
      return NextResponse.json({
        done: false,
        advance: true,
        accuracy,
        nextRound: getPlacementRound(nextLevel),
        completedLevels: completed,
        accuracies,
      });
    }

    const finalLevel = normalizeGermanLevel(
      levelFromPlacement(completed, accuracies as Record<PlacementLevel, number>)
    );
    const score = Math.round(
      Object.values(accuracies).reduce((a, b) => a + b, 0) / Object.keys(accuracies).length * 100
    );
    await completePlacement(user.userId, finalLevel, score);

    return NextResponse.json({
      done: true,
      level: finalLevel,
      score,
      accuracy,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
