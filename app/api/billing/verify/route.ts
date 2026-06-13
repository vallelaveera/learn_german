import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";
import type { PlanId } from "@/lib/plans";
import { isPaidPlan } from "@/lib/plans";
import { activatePlan } from "@/lib/subscription";
import { billingDisabledResponse, isBillingEnabled } from "@/lib/billing-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isBillingEnabled()) return billingDisabledResponse();

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    plan,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = body as {
    plan?: PlanId;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  if (!plan || !isPaidPlan(plan) || !orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const updated = await activatePlan(user.userId, plan, paymentId);
  if (!updated) return NextResponse.json({ error: "Activation failed" }, { status: 500 });

  return NextResponse.json({ ok: true, plan, subscriptionExpiresAt: updated.subscriptionExpiresAt });
}
