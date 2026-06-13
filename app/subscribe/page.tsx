"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { SubscribePlans } from "@/components/billing/SubscribePlans";
import { isBillingEnabledClient } from "@/lib/billing-config-client";

export default function SubscribePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isBillingEnabledClient()) router.replace("/profile");
  }, [router]);

  if (!isBillingEnabledClient()) return null;

  return (
    <PageShell title="Abo & Minuten">
      <div style={{ padding: "16px 18px" }}>
        <SubscribePlans />
      </div>
    </PageShell>
  );
}
