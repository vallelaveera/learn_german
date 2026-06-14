"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarVerifiedTrainerScreen } from "@/components/grammar/catalog/GrammarVerifiedTrainerScreen";
import type { GrammarTier } from "@/lib/grammar/verified-curriculum";

function A1TensesInner() {
  const tier: GrammarTier = useSearchParams().get("tier") === "advanced" ? "advanced" : "basic";
  return (
    <GrammarVerifiedTrainerScreen
      level="A1"
      category="tenses"
      tier={tier}
      title="Zeiten A1 — Präsens"
      subtitle="sein · haben · regelmäßige Verben"
    />
  );
}

export default function A1TensesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}>
      <A1TensesInner />
    </Suspense>
  );
}
