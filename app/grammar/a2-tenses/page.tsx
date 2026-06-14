"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarVerifiedTrainerScreen } from "@/components/grammar/catalog/GrammarVerifiedTrainerScreen";
import type { GrammarTier } from "@/lib/grammar/verified-curriculum";

function A2TensesInner() {
  const tier: GrammarTier = useSearchParams().get("tier") === "advanced" ? "advanced" : "basic";
  return (
    <GrammarVerifiedTrainerScreen
      level="A2"
      category="tenses"
      tier={tier}
      title="Zeiten A2 — Perfekt & Präteritum"
      subtitle="haben/sein + Partizip II · seit → Präsens"
    />
  );
}

export default function A2TensesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}>
      <A2TensesInner />
    </Suspense>
  );
}
