import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { setUserLimit, getUsageStats } from "@/lib/kv";

export const runtime = "nodejs";

function isAdmin(req: NextRequest): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return false;
  const user = verifyToken(token);
  return user?.email?.toLowerCase() === adminEmail.toLowerCase();
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { userId, minutes } = await req.json();
    if (!userId || !minutes) return NextResponse.json({ error: "userId and minutes required" }, { status: 400 });
    await setUserLimit(userId, minutes);
    const usage = await getUsageStats(userId);
    return NextResponse.json({ ok: true, usage });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
