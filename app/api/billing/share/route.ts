import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  inviteProShareMember,
  removeProShareMember,
  getBillingSummary,
} from "@/lib/subscription";
import { billingDisabledResponse, isBillingEnabled } from "@/lib/billing-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isBillingEnabled()) return billingDisabledResponse();

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const billing = await getBillingSummary(user.userId);
  return NextResponse.json({ billing });
}

export async function POST(req: NextRequest) {
  if (!isBillingEnabled()) return billingDisabledResponse();

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = (await req.json()) as { email?: string };
  if (!email?.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const result = await inviteProShareMember(user.userId, email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, member: { name: result.member.name, email: result.member.email } });
}

export async function DELETE(req: NextRequest) {
  if (!isBillingEnabled()) return billingDisabledResponse();

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const ok = await removeProShareMember(user.userId, memberId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
