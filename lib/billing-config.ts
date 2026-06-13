import { NextResponse } from "next/server";

/** Unlimited sentinel — used when billing is disabled (default). */
export const BILLING_DISABLED_LIMIT = 999_999;

/**
 * Master billing switch. Default OFF for safe production deploys.
 * Set `BILLING_ENABLED=true` (and `NEXT_PUBLIC_BILLING_ENABLED=true` for UI) to enable
 * minute caps, /subscribe, and Razorpay checkout.
 */
export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

export function billingDisabledUsageStats(): {
  used: number;
  limit: number;
  remaining: number;
} {
  return { used: 0, limit: BILLING_DISABLED_LIMIT, remaining: BILLING_DISABLED_LIMIT };
}

export function billingDisabledTickResult(): {
  used: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
  billingEnabled: false;
} {
  return { ...billingDisabledUsageStats(), limitReached: false, billingEnabled: false };
}

export function billingDisabledResponse() {
  return NextResponse.json(
    { error: "Billing not enabled", enabled: false },
    { status: 404 },
  );
}
