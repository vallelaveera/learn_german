import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRecentSessions, getUnpracticedWords, getDaysSinceLastCall, updateStreak } from "@/lib/kv";
import { generateOpening, buildSystemPrompt, buildOnboardingPrompt, buildOnboardingOpening, isProfileComplete, getMissingFields, generateTopicSuggestions } from "@/lib/memory-agent";

export const runtime = "nodejs";

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

    const [opening, systemPrompt, topics] = await Promise.all([
      generateOpening(user, daysSince, unpracticedWords, recentTopics),
      Promise.resolve(buildSystemPrompt(user, daysSince, unpracticedWords)),
      generateTopicSuggestions(user),
    ]);

    // Build topic opening
    const topicList = topics.map((t, i) => `${i + 1}. ${t}`).join("\n");
    const topicOpening = `${opening}\n\nWas möchtest du heute üben?\n${topicList}\n\nOder wir plaudern einfach — was du willst! 😊`;

    return NextResponse.json({
      opening: topicOpening,
      systemPrompt,
      user,
      daysSinceLastCall: daysSince,
      unpracticedWords,
      streak: user.streak,
      isOnboarding: false,
      topics,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Context failed" }, { status: 500 });
  }
}
