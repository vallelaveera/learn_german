"use client";

import { Suspense } from "react";
import { GrammarGenderScreen } from "@/components/grammar/gender/GrammarGenderScreen";

export default function GenderTrainerPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
        </div>
      }
    >
      <GrammarGenderScreen />
    </Suspense>
  );
}
