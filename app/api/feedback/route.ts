import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthUser } from "@/lib/auth";
import { saveUserFeedback } from "@/lib/kv";
import type { SubmitFeedbackPayload } from "@/lib/feedback/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampRating(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const n = Math.round(value);
  if (n < 1 || n > 5) return null;
  return n;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Partial<SubmitFeedbackPayload>;
    const rating = clampRating(body.rating);
    const wouldUseAgain = clampRating(body.wouldUseAgain);
    if (!rating || !wouldUseAgain) {
      return NextResponse.json({ error: "Rating and wouldUseAgain must be 1–5" }, { status: 400 });
    }

    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    const source = body.source === "post_call" || body.source === "profile" || body.source === "home"
      ? body.source
      : "profile";

    await saveUserFeedback({
      id: uuidv4(),
      userId: user.userId,
      userName: user.name,
      userEmail: user.email,
      rating,
      wouldUseAgain,
      message,
      source,
      callMode: typeof body.callMode === "string" ? body.callMode.slice(0, 32) : undefined,
      sessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : undefined,
      createdAt: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("feedback POST:", e);
    return NextResponse.json({ error: "Feedback failed" }, { status: 500 });
  }
}
