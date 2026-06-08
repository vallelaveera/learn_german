import { NextRequest, NextResponse } from "next/server";
import { saveSession, listSessions, saveVocabWords } from "@/lib/kv";
import { Session } from "@/lib/types";

export async function GET() {
  try {
    const sessions = await listSessions(50);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session: Session = await req.json();
    await saveSession(session);
    if (session.newWords && session.newWords.length > 0) {
      await saveVocabWords(session.newWords);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
