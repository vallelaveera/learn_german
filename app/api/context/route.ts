import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRecentSessions, getUnpracticedWords, getDaysSinceLastCall, updateStreak } from "@/lib/kv";
import { generateOpening, buildSystemPrompt, buildOnboardingPrompt, buildOnboardingOpening } from "@/lib/memory-agent";

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

    await updateStreak(user.userId);

    // First time user — use onboarding
    if (user.totalSessions === 0) {
      const opening = buildOnboardingOpening(user.name);
      const systemPrompt = buildOnboardingPrompt(user.name);
      return NextResponse.json({
        opening,
        systemPrompt,
        user,
        daysSinceLastCall: 999,
        unpracticedWords: [],
        streak: 0,
        isOnboarding: true,
      });
    }

    const [opening, systemPrompt] = await Promise.all([
      generateOpening(user, daysSince, unpracticedWords, recentTopics),
      Promise.resolve(buildSystemPrompt(user, daysSince, unpracticedWords)),
    ]);

    return NextResponse.json({
      opening,
      systemPrompt,
      user,
      daysSinceLastCall: daysSince,
      unpracticedWords,
      streak: user.streak,
      isOnboarding: false,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Context failed" }, { status: 500 });
  }
}
