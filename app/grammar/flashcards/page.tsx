"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GrammarFlashcardTrainer } from "@/components/grammar/GrammarFlashcardTrainer";
import { getGrammarPoint } from "@/lib/grammar/curriculum";

function FlashcardsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const pointId = params.get("point");
  const point = pointId ? getGrammarPoint(pointId) : null;

  useEffect(() => {
    if (!pointId || !point) router.replace("/grammar");
  }, [point, pointId, router]);

  if (!point) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
      </div>
    );
  }

  if (!point.practiceTypes.includes("flashcard")) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>
          Für dieses Thema gibt es noch keine Karteikarten.
        </p>
      </div>
    );
  }

  return <GrammarFlashcardTrainer point={point} />;
}

export default function GrammarFlashcardsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
        </div>
      }
    >
      <FlashcardsPageInner />
    </Suspense>
  );
}
