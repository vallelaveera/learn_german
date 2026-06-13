import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRecentSessions, getUnpracticedWords, getDaysSinceLastCall, getPendingHomeworkList } from "@/lib/kv";
import { generateOpening, buildSystemPrompt, buildOnboardingPrompt, buildOnboardingOpening, buildOnboardingOpeningPart2, isProfileComplete, getMissingFields, generateTopicSuggestions, generateHomeworkNagOpening } from "@/lib/memory-agent";
import { resolveNativeLanguage } from "@/lib/native-languages";
import { getUsageStats } from "@/lib/kv";
import { isBillingEnabled } from "@/lib/billing-config";
import { isHomeworkEnabledForUser, summarizeHomeworkList } from "@/lib/homework";
import { getScenario, parseScenarioId } from "@/lib/exercises/scenarios";
import {
  buildGrammarSystemPromptAppendix,
  getGrammarPoint,
} from "@/lib/grammar/curriculum";

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

    // Check usage limit (skipped when billing disabled)
    const usage = await getUsageStats(user.userId);
    if (isBillingEnabled() && usage.remaining <= 0) {
      return NextResponse.json({
        limitReached: true,
        used: usage.used,
        limit: usage.limit,
        user,
      });
    }

    // Check if profile is complete — if not, still in onboarding phase
    const profileComplete = isProfileComplete(user);
    const missingFields = getMissingFields(user);

    if (!profileComplete) {
      const isFirstEver = user.totalSessions === 0;
      const nativeLanguage = resolveNativeLanguage(user);
      const opening = isFirstEver
        ? buildOnboardingOpening(user.name)
        : `Hallo ${user.name}! Schön, dass du wieder da bist. ${missingFields.length > 0 ? "Ich würde dich noch etwas besser kennenlernen — " + getNextQuestion(missingFields) : ""}`;
      const openingFollowUp = isFirstEver ? buildOnboardingOpeningPart2() : undefined;
      const systemPrompt = buildOnboardingPrompt(user.name, missingFields, {
        nativeLanguage,
        germanLevel: user.germanLevel ?? user.facts.germanLevel,
      });
      return NextResponse.json({
        opening,
        openingFollowUp,
        systemPrompt,
        user,
        daysSinceLastCall: daysSince,
        unpracticedWords: [],
        streak: user.streak,
        isOnboarding: true,
        missingFields,
      });
    }

    const scenarioId = parseScenarioId(req.nextUrl.searchParams.get("scenario"));
    const scenario = getScenario(scenarioId);
    const practiceScenario = scenario
      ? { label: scenario.label, prompt: scenario.callPrompt }
      : undefined;

    const grammarId =
      req.nextUrl.searchParams.get("grammar")
      ?? req.headers.get("x-grammar-id")
      ?? null;
    const grammarPoint = grammarId ? getGrammarPoint(grammarId) : null;
    const grammarContext = grammarPoint
      ? buildGrammarSystemPromptAppendix(grammarPoint)
      : "";

    const [opening, systemPrompt, topics, homeworkEnabled, pendingList] = await Promise.all([
      generateOpening(user, daysSince, unpracticedWords, recentTopics),
      Promise.resolve(buildSystemPrompt(user, daysSince, unpracticedWords, false, 0, practiceScenario)),
      generateTopicSuggestions(user),
      isHomeworkEnabledForUser(user.userId),
      isHomeworkEnabledForUser(user.userId).then(async enabled => {
        if (!enabled) return [] as Awaited<ReturnType<typeof getPendingHomeworkList>>;
        return getPendingHomeworkList(user.userId);
      }),
    ]);

    const homeworkSummary = summarizeHomeworkList(pendingList);
    const pendingHomework = pendingList[0] ?? null;

    let homeworkNagActive = false;
    let normalOpening = opening;
    let finalOpening = opening;

    if (pendingHomework && homeworkSummary.remainingReps > 0) {
      homeworkNagActive = true;
      finalOpening = await generateHomeworkNagOpening(user.name, homeworkSummary.remainingReps);
      normalOpening = opening;
    }

    const finalSystemPrompt = (
      homeworkNagActive
        ? buildSystemPrompt(user, daysSince, unpracticedWords, true, homeworkSummary.remainingReps, practiceScenario)
        : buildSystemPrompt(user, daysSince, unpracticedWords, false, homeworkSummary.remainingReps, practiceScenario)
    ) + grammarContext;

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
      grammarFocus: grammarPoint ?? null,
      pendingHomework: pendingHomework ? {
        id: pendingHomework.id,
        sentences: pendingHomework.sentences,
        topic: pendingHomework.topic,
        progress: {
          completedReps: homeworkSummary.completedReps,
          totalReps: homeworkSummary.totalReps,
          completedSentences: 0,
        },
      } : null,
      homeworkSummary,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Context failed" }, { status: 500 });
  }
}
