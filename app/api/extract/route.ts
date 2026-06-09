import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateUserFacts, saveVocabWords, markWordsUsedByUser } from "@/lib/kv";
import { extractFacts, extractProfileFacts, extractAskedTopics } from "@/lib/memory-agent";
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

    const { messages }: { messages: Message[] } = await req.json();
    if (!messages?.length) return NextResponse.json({ ok: true });

    const mayaWords = getWords(
      messages.filter((m: Message) => m.role === "assistant").map((m: Message) => m.content).join(" ")
    );
    const userWords = getWords(
      messages.filter((m: Message) => m.role === "user").map((m: Message) => m.content).join(" ")
    );

    const [newFacts, profileFacts, newTopics] = await Promise.all([
      extractFacts(messages, user.facts),
      extractProfileFacts(messages, user.facts),
      extractAskedTopics(messages),
    ]);

    // Merge all facts + append new asked topics
    const existingTopics = user.facts.askedTopics ?? [];
    const mergedFacts = {
      ...newFacts,
      ...profileFacts,
      askedTopics: Array.from(new Set([...existingTopics, ...newTopics])).slice(0, 50),
    };

    await Promise.all([
      saveVocabWords(user.userId, mayaWords),
      markWordsUsedByUser(user.userId, userWords),
      updateUserFacts(user.userId, mergedFacts),
    ]);

    return NextResponse.json({ ok: true, facts: newFacts });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Extract failed" }, { status: 500 });
  }
}
