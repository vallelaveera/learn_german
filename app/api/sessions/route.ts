import { NextRequest, NextResponse } from "next/server";
import { saveSession, listSessions, saveVocabWords } from "@/lib/kv";
import { getAuthUser } from "@/lib/auth";
import { Session } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ sessions: [] });
    const sessions = await listSessions(user.userId, 50);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session: Session = await req.json();
    session.userId = user.userId;
    await saveSession(session);

    if (session.newWords?.length) {
      await saveVocabWords(user.userId, session.newWords);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
