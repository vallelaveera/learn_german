import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { settleCallUsage } from "@/lib/kv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, sessionStart } = (await req.json()) as {
    sessionId?: string;
    sessionStart?: number;
  };
  if (!sessionId || !sessionStart) {
    return NextResponse.json({ error: "sessionId and sessionStart required" }, { status: 400 });
  }

  const usage = await settleCallUsage(user.userId, sessionId, sessionStart);
  return NextResponse.json({ ok: true, ...usage });
}
