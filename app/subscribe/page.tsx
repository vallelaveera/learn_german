"use client";

import { PageShell } from "@/components/layout/PageShell";
import { SubscribePlans } from "@/components/billing/SubscribePlans";

export default function SubscribePage() {
  return (
    <PageShell title="Abo & Minuten">
      <div style={{ padding: "16px 18px" }}>
        <SubscribePlans />
      </div>
    </PageShell>
  );
}
