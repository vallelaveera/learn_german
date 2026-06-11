import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateUserFacts, saveVocabWords, markWordsUsedByUser, addMinutes, updateCareerVocabProgress, getUsageStats, saveHomework } from "@/lib/kv";
import { matchCareerVocabFromMessages } from "@/lib/career-vocab/match";
import { extractFacts, extractProfileFacts, extractAskedTopics, extractAskedQuestionsFromMessages, mergeAskedQuestions, generateHomework, isProfileComplete } from "@/lib/memory-agent";
import { isHomeworkEnabledForUser } from "@/lib/homework";
import { Message } from "@/lib/types";

export const runtime = "nodejs";

function getWords(text: string): string[] {
  return Array.from(new Set(
    text.toLowerCase()
      .replace(/[^a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 4)
  ));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, sessionStart, sessionEnd, sessionId }: {
      messages: Message[];
      sessionStart?: number;
      sessionEnd?: number;
      sessionId?: string;
    } = await req.json();
    if (!messages?.length) return NextResponse.json({ ok: true });

    const usage = await getUsageStats(user.userId);
    const isSessionEnd = !!(sessionStart && sessionEnd && sessionEnd > sessionStart);
    if (usage.remaining <= 0 && !isSessionEnd) {
      return NextResponse.json({ error: "limit_reached", used: usage.used, limit: usage.limit }, { status: 403 });
    }

    const mayaWords = getWords(
      messages.filter((m: Message) => m.role === "assistant").map((m: Message) => m.content).join(" ")
    );
    const userWords = getWords(
      messages.filter((m: Message) => m.role === "user").map((m: Message) => m.content).join(" ")
    );

    const newQuestions = extractAskedQuestionsFromMessages(messages);
    const careerMatches = matchCareerVocabFromMessages(messages);

    const [newFacts, profileFacts, newTopics] = await Promise.all([
      extractFacts(messages, user.facts),
      extractProfileFacts(messages, user.facts),
      extractAskedTopics(messages),
    ]);

    // Merge all facts + append new asked topics/questions
    const existingTopics = user.facts.askedTopics ?? [];
    const existingQuestions = user.facts.askedQuestions ?? [];
    const mergedFacts = {
      ...newFacts,
      ...profileFacts,
      askedTopics: Array.from(new Set([...existingTopics, ...newTopics])).slice(0, 50),
      askedQuestions: mergeAskedQuestions(existingQuestions, newQuestions),
    };

    const promises: Promise<unknown>[] = [
      saveVocabWords(user.userId, mayaWords),
      markWordsUsedByUser(user.userId, userWords),
      updateUserFacts(user.userId, mergedFacts),
      updateCareerVocabProgress(user.userId, careerMatches.userMatched, careerMatches.mayaMatched),
    ];

    // Track minutes — only called once at session end
    if (sessionStart && sessionEnd) {
      const mins = (sessionEnd - sessionStart) / 60000;
      if (mins > 0 && mins < 120) promises.push(addMinutes(user.userId, mins));
    }

    await Promise.all(promises);

    let homeworkId: string | undefined;
    if (
      messages.length > 1 &&
      isProfileComplete(user) &&
      (await isHomeworkEnabledForUser(user.userId))
    ) {
      try {
        const sentences = await generateHomework(messages, user.germanLevel ?? user.facts.germanLevel);
        if (sentences.length > 0) {
          homeworkId = await saveHomework(user.userId, sessionId, sentences);
        }
      } catch (e) {
        console.error("Homework generation failed (non-fatal):", e);
      }
    }

    return NextResponse.json({ ok: true, facts: newFacts, homeworkId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Extract failed" }, { status: 500 });
  }
}
