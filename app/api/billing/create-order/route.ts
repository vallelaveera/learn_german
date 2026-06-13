import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getRazorpayClient, getRazorpayKeyId, paidPlanAmount } from "@/lib/razorpay";
import type { PlanId } from "@/lib/plans";
import { isPaidPlan } from "@/lib/plans";
import { getUserProfile, saveUserProfile } from "@/lib/kv";
import { billingDisabledResponse, isBillingEnabled } from "@/lib/billing-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isBillingEnabled()) return billingDisabledResponse();

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = (await req.json()) as { plan?: PlanId };
  if (!plan || !isPaidPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const razorpay = getRazorpayClient();
  const keyId = getRazorpayKeyId();
  if (!razorpay || !keyId) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  const amount = paidPlanAmount(plan);
  const receipt = `${plan}_${user.userId.slice(0, 8)}_${Date.now()}`;

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: { userId: user.userId, plan },
    });

    const profile = await getUserProfile(user.userId);
    if (profile) {
      profile.razorpayOrderId = order.id;
      await saveUserProfile(profile);
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      plan,
      userName: user.name,
      userEmail: user.email,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}
