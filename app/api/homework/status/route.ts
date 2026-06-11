import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getPendingHomeworkList } from "@/lib/kv";
import { isHomeworkEnabledForUser, summarizeHomeworkList } from "@/lib/homework";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const enabled = await isHomeworkEnabledForUser(user.userId);
    if (!enabled) {
      return NextResponse.json({ enabled: false, remainingReps: 0, pendingCount: 0 });
    }

    const assignments = await getPendingHomeworkList(user.userId);
    const summary = summarizeHomeworkList(assignments);
    return NextResponse.json({ enabled: true, ...summary });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load homework status" }, { status: 500 });
  }
}
