import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUsageStats } from "@/lib/kv";
import { getBillingSummary } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [usage, billing] = await Promise.all([
    getUsageStats(user.userId),
    getBillingSummary(user.userId),
  ]);

  return NextResponse.json({ usage, billing });
}
