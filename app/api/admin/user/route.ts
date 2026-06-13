import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { deleteUserAccount, getUserProfile, listSessions, getVocab, getUsageStats } from "@/lib/kv";

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
        words: vocab.map(w => ({
          word: w.word,
          timesSeen: w.timesSeen,
          correctCount: w.correctCount ?? 0,
          usedByUser: w.usedByUser ?? false,
        })),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 });

  try {
    const profile = await getUserProfile(userId);
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail && profile.email.toLowerCase() === adminEmail) {
      return NextResponse.json({ error: "Cannot delete admin account" }, { status: 400 });
    }

    const deleted = await deleteUserAccount(userId);
    if (!deleted) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
