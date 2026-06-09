import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateUserFacts, saveVocabWords, markWordsUsedByUser, getNewWordsForSession } from "@/lib/kv";
import { extractFacts } from "@/lib/memory-agent";
import { Message } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages }: { messages: Message[] } = await req.json();
    if (!messages?.length) return NextResponse.json({ ok: true });

    const wordPattern = /\b[a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]{4,20}\b/g;

    const mayaText = messages.filter((m: Message) => m.role === "assistant").map((m: Message) => m.content).join(" ");
    const mayaWords = Array.from(new Set(mayaText.match(wordPattern) || [])) as string[];

    const userText = messages.filter((m: Message) => m.role === "user").map((m: Message) => m.content).join(" ");
    const userWords = Array.from(new Set(userText.match(wordPattern) || [])) as string[];

    const newWords = await getNewWordsForSession(user.userId, messages);

    const [newFacts] = await Promise.all([
      extractFacts(messages, user.facts),
      saveVocabWords(user.userId, mayaWords),
      markWordsUsedByUser(user.userId, userWords),
    ]);

    await updateUserFacts(user.userId, newFacts);

    return NextResponse.json({ ok: true, facts: newFacts, newWords });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Extract failed" }, { status: 500 });
  }
}
