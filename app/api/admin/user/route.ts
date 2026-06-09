import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getUserProfile, listSessions, getVocab, getUsageStats } from "@/lib/kv";

export const runtime = "nodejs";

function isAdmin(req: NextRequest): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return false;
  const user = verifyToken(token);
  return user?.email?.toLowerCase() === adminEmail.toLowerCase();
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 });

  try {
    const [profile, sessions, vocab, usage] = await Promise.all([
      getUserProfile(userId),
      listSessions(userId, 999),
      getVocab(userId),
      getUsageStats(userId),
    ]);

    return NextResponse.json({
      profile,
      usage,
      sessions: sessions.map(s => ({
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        totalMessages: s.totalMessages ?? s.messages?.length ?? 0,
        newWords: s.newWords?.length ?? 0,
        title: s.title,
        messages: s.messages,
      })),
      vocab: {
        total: vocab.length,
        learned: vocab.filter(w => w.usedByUser).length,
        new: vocab.filter(w => !w.usedByUser).length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
