import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { listSessions, saveVocabWords, markWordsUsedByUser } from "@/lib/kv";

export const runtime = "nodejs";

function getWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 4)
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await listSessions(user.userId, 999);
    const mayaWords = new Set<string>();
    const userWords = new Set<string>();

    for (const session of sessions) {
      for (const msg of session.messages ?? []) {
        const words = getWords(msg.content);
        if (msg.role === "assistant") words.forEach(w => mayaWords.add(w));
        else words.forEach(w => userWords.add(w));
      }
    }

    await saveVocabWords(user.userId, Array.from(mayaWords));
    await markWordsUsedByUser(user.userId, Array.from(userWords));

    const newWords = Array.from(mayaWords)
      .filter(w => !userWords.has(w))
      .sort((a, b) => b.length - a.length);

    return NextResponse.json({
      ok: true,
      sessions: sessions.length,
      maya_total: mayaWords.size,
      user_total: userWords.size,
      new_words: newWords.length,
      sample: newWords.slice(0, 20),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
