import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { listSessions, saveVocabWords, markWordsUsedByUser, updateCareerVocabProgress } from "@/lib/kv";
import { matchCareerVocabFromMessages } from "@/lib/career-vocab/match";

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
    const careerUserMatched = new Set<string>();
    const careerMayaMatched = new Set<string>();

    for (const session of sessions) {
      const career = matchCareerVocabFromMessages(session.messages ?? []);
      career.userMatched.forEach(id => careerUserMatched.add(id));
      career.mayaMatched.forEach(id => careerMayaMatched.add(id));

      for (const msg of session.messages ?? []) {
        const words = getWords(msg.content);
        if (msg.role === "assistant") words.forEach(w => mayaWords.add(w));
        else words.forEach(w => userWords.add(w));
      }
    }

    await saveVocabWords(user.userId, Array.from(mayaWords));
    await markWordsUsedByUser(user.userId, Array.from(userWords));
    await updateCareerVocabProgress(
      user.userId,
      Array.from(careerUserMatched),
      Array.from(careerMayaMatched)
    );

    const newWords = Array.from(mayaWords)
      .filter(w => !userWords.has(w))
      .sort((a, b) => b.length - a.length);

    return NextResponse.json({
      ok: true,
      sessions: sessions.length,
      maya_total: mayaWords.size,
      user_total: userWords.size,
      new_words: newWords.length,
      career_used: careerUserMatched.size,
      career_exposed: careerMayaMatched.size,
      sample: newWords.slice(0, 20),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
