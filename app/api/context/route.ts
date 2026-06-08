import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRecentSessions, getUnpracticedWords, getDaysSinceLastCall, updateStreak } from "@/lib/kv";
import { generateOpening, buildSystemPrompt } from "@/lib/memory-agent";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [daysSince, unpracticedWords, recentSessions] = await Promise.all([
      getDaysSinceLastCall(user.userId),
      getUnpracticedWords(user.userId, 5),
      getRecentSessions(user.userId, 3),
    ]);

    const recentTopics = recentSessions
      .flatMap(s => s.extractedFacts?.personalDetails ?? [])
      .slice(0, 5);

    const [opening, systemPrompt] = await Promise.all([
      generateOpening(user, daysSince, unpracticedWords, recentTopics),
      Promise.resolve(buildSystemPrompt(user, daysSince, unpracticedWords)),
    ]);

    await updateStreak(user.userId);

    return NextResponse.json({
      opening,
      systemPrompt,
      user,
      daysSinceLastCall: daysSince,
      unpracticedWords,
      streak: user.streak,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Context failed" }, { status: 500 });
  }
}
