"use client";

import { Suspense } from "react";
import { GrammarTensesScreen } from "@/components/grammar/tenses/GrammarTensesScreen";

export default function GrammarTensesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
        </div>
      }
    >
      <GrammarTensesScreen />
    </Suspense>
  );
}
