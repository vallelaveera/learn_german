"use client";

import { Suspense } from "react";
import { GrammarCasesScreen } from "@/components/grammar/cases/GrammarCasesScreen";

export default function CasesTrainerPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
        </div>
      }
    >
      <GrammarCasesScreen />
    </Suspense>
  );
}
