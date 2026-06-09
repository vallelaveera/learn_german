import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateUserFacts, saveVocabWords, markWordsUsedByUser } from "@/lib/kv";
import { extractFacts } from "@/lib/memory-agent";
import { Message } from "@/lib/types";

export const runtime = "nodejs";

function extractWords(text: string): string[] {
  return text
    .split(/[\s.,!?;:'"()\-–—]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3)
    .map(w => w.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages }: { messages: Message[] } = await req.json();
    if (!messages?.length) return NextResponse.json({ ok: true });

    // SET_M — all words Maya said
    const mayaText = messages
      .filter((m: Message) => m.role === "assistant")
      .map((m: Message) => m.content)
      .join(" ");
    const mayaWords = Array.from(new Set(extractWords(mayaText)));

    // SET_U — all words user said
    const userText = messages
      .filter((m: Message) => m.role === "user")
      .map((m: Message) => m.content)
      .join(" ");
    const userWords = Array.from(new Set(extractWords(userText)));

    // Save Maya's words to vocab DB
    // Mark user's words as practiced
    await Promise.all([
      saveVocabWords(user.userId, mayaWords),
      markWordsUsedByUser(user.userId, userWords),
    ]);

    // Extract personal facts
    const newFacts = await extractFacts(messages, user.facts);
    await updateUserFacts(user.userId, newFacts);

    return NextResponse.json({ ok: true, facts: newFacts });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Extract failed" }, { status: 500 });
  }
}
