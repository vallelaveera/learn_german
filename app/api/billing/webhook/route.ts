import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { activatePlan } from "@/lib/subscription";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const body = await req.text();

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(body) as {
      event?: string;
      payload?: {
        payment?: { entity?: { notes?: { userId?: string; plan?: PlanId } } };
      };
    };

    if (event.event === "payment.captured") {
      const notes = event.payload?.payment?.entity?.notes;
      const userId = notes?.userId;
      const plan = notes?.plan;
      if (userId && plan && (plan === "basic" || plan === "pro")) {
        await activatePlan(userId, plan);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
