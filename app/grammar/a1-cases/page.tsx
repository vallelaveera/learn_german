"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarVerifiedTrainerScreen } from "@/components/grammar/catalog/GrammarVerifiedTrainerScreen";
import type { GrammarTier } from "@/lib/grammar/verified-curriculum";

function A1CasesInner() {
  const tier: GrammarTier = useSearchParams().get("tier") === "advanced" ? "advanced" : "basic";
  return (
    <GrammarVerifiedTrainerScreen
      level="A1"
      category="cases"
      tier={tier}
      title="Fälle A1 — Nominativ & Akkusativ"
      subtitle="Wer? Was? · Wen? Was?"
    />
  );
}

export default function A1CasesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}>
      <A1CasesInner />
    </Suspense>
  );
}
