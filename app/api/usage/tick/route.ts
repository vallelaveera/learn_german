import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { tickUsageMinute } from "@/lib/kv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const result = await tickUsageMinute(user.userId, sessionId);
  return NextResponse.json({ ok: true, ...result });
}
