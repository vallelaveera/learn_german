import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRecentSessions, getUnpracticedWords, getDaysSinceLastCall, getActiveHomework } from "@/lib/kv";
import { generateOpening, buildSystemPrompt, buildOnboardingPrompt, buildOnboardingOpening, isProfileComplete, getMissingFields, generateTopicSuggestions, generateHomeworkNagOpening } from "@/lib/memory-agent";
import { getUsageStats } from "@/lib/kv";
import { isHomeworkEnabledForUser, getHomeworkProgress } from "@/lib/homework";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getNextQuestion(missingFields: string[]): string {
  const questions: Record<string, string> = {
    "job_or_study": "Bist du Student oder berufstätig?",
    "why_learning_german": "Warum lernst du Deutsch?",
    "hobbies_interests": "Was machst du gerne in deiner Freizeit?",
    "native_language": "Welche Sprache sprichst du zu Hause?",
  };
  return questions[missingFields[0]] ?? "Erzähl mir mehr über dich!";
}

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

    // Check usage limit
    const usage = await getUsageStats(user.userId);
    if (usage.remaining <= 0) {
      return NextResponse.json({
        limitReached: true,
        used: usage.used,
        limit: usage.limit,
        user,
      });
    }

    // Check if profile is complete — if not, still in onboarding phase
    const profileComplete = isProfileComplete(user.facts);
    const missingFields = getMissingFields(user.facts);

    if (!profileComplete) {
      const isFirstEver = user.totalSessions === 0;
      const opening = isFirstEver
        ? buildOnboardingOpening(user.name)
        : `Hallo ${user.name}! Schön, dass du wieder da bist. ${missingFields.length > 0 ? "Ich würde dich noch etwas besser kennenlernen — " + getNextQuestion(missingFields) : ""}`;
      const systemPrompt = buildOnboardingPrompt(user.name, missingFields);
      return NextResponse.json({
        opening,
        systemPrompt,
        user,
        daysSinceLastCall: daysSince,
        unpracticedWords: [],
        streak: user.streak,
        isOnboarding: true,
        missingFields,
      });
    }

    const [opening, systemPrompt, topics, homeworkEnabled, pendingHomework] = await Promise.all([
      generateOpening(user, daysSince, unpracticedWords, recentTopics),
      Promise.resolve(buildSystemPrompt(user, daysSince, unpracticedWords)),
      generateTopicSuggestions(user),
      isHomeworkEnabledForUser(user.userId),
      isHomeworkEnabledForUser(user.userId).then(async enabled => {
        if (!enabled) return null;
        return getActiveHomework(user.userId);
      }),
    ]);

    let homeworkNagActive = false;
    let normalOpening = opening;
    let finalOpening = opening;
    let homeworkProgress = null;

    if (pendingHomework) {
      homeworkProgress = getHomeworkProgress(pendingHomework);
      const remaining = homeworkProgress.totalReps - homeworkProgress.completedReps;
      if (remaining > 0) {
        homeworkNagActive = true;
        finalOpening = await generateHomeworkNagOpening(user.name, remaining);
        normalOpening = opening;
      }
    }

    const finalSystemPrompt = homeworkNagActive
      ? buildSystemPrompt(user, daysSince, unpracticedWords, true)
      : systemPrompt;

    return NextResponse.json({
      opening: finalOpening,
      normalOpening,
      systemPrompt: finalSystemPrompt,
      user,
      daysSinceLastCall: daysSince,
      unpracticedWords,
      streak: user.streak,
      isOnboarding: false,
      topics,
      usage,
      homeworkEnabled,
      homeworkNagActive,
      pendingHomework: pendingHomework ? {
        id: pendingHomework.id,
        sentences: pendingHomework.sentences,
        progress: homeworkProgress,
      } : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Context failed" }, { status: 500 });
  }
}
