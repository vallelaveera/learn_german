"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExerciseCategoryPicker } from "@/components/exercises/ExerciseCategoryPicker";
import { WordsPractice } from "@/components/exercises/WordsPractice";
import { parseWordCategory } from "@/lib/exercises/categories";

function WordsPageInner() {
  const params = useSearchParams();
  const category = params.get("category");
  if (!category) return <ExerciseCategoryPicker type="words" />;
  return <WordsPractice category={parseWordCategory(category)} />;
}

export default function WordsPracticePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
      </div>
    }>
      <WordsPageInner />
    </Suspense>
  );
}
