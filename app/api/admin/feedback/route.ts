import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { listUserFeedback } from "@/lib/kv";

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

  const limit = Math.min(200, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50);
  const feedback = await listUserFeedback(limit);
  return NextResponse.json({ feedback });
}
