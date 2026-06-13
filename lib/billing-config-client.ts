/** Client mirror of BILLING_ENABLED — set NEXT_PUBLIC_BILLING_ENABLED=true when enabling billing. */
export function isBillingEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
}
