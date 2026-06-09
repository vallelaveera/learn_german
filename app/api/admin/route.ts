import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getUserProfile, listSessions } from "@/lib/kv";

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

  try {
    // Get all user IDs from Redis
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const keys = await redis.keys("user:*");
    const userIds = keys.map((k: string) => k.replace("user:", ""));

    const users = await Promise.all(
      userIds.map(async (id) => {
        const profile = await getUserProfile(id);
        if (!profile) return null;
        const sessions = await listSessions(id, 999);
        const totalMinutes = sessions.reduce((a, s) =>
          a + (s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : 0), 0);
        return {
          userId: id,
          name: profile.name,
          email: profile.email,
          germanLevel: profile.germanLevel,
          streak: profile.streak,
          totalSessions: sessions.length,
          totalMinutes,
          lastActiveAt: profile.lastActiveAt,
          createdAt: profile.createdAt,
          facts: profile.facts,
        };
      })
    );

    const validUsers = users.filter(Boolean);
    const totalSessions = validUsers.reduce((a, u) => a + (u?.totalSessions ?? 0), 0);
    const totalMinutes = validUsers.reduce((a, u) => a + (u?.totalMinutes ?? 0), 0);
    const today = Date.now() - 24 * 60 * 60 * 1000;
    const activeToday = validUsers.filter(u => (u?.lastActiveAt ?? 0) > today).length;

    return NextResponse.json({
      stats: {
        totalUsers: validUsers.length,
        activeToday,
        totalSessions,
        totalMinutes,
      },
      users: validUsers.sort((a, b) => (b?.lastActiveAt ?? 0) - (a?.lastActiveAt ?? 0)),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
