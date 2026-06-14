"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarVerifiedTrainerScreen } from "@/components/grammar/catalog/GrammarVerifiedTrainerScreen";
import type { GrammarTier } from "@/lib/grammar/verified-curriculum";

function A2CasesInner() {
  const tier: GrammarTier = useSearchParams().get("tier") === "advanced" ? "advanced" : "basic";
  return (
    <GrammarVerifiedTrainerScreen
      level="A2"
      category="cases"
      tier={tier}
      title="Fälle A2 — Dativ"
      subtitle="Wem? · mit, von, zu, nach…"
    />
  );
}

export default function A2CasesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}>
      <A2CasesInner />
    </Suspense>
  );
}
