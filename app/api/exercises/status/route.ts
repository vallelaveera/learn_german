import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isPlacementDone } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const placementDone = (await isPlacementDone(user.userId)) || user.totalSessions > 0;
    return NextResponse.json({
      placementDone,
      germanLevel: user.germanLevel,
      placementScore: user.facts.placementScore,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
