"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArticleTrainer } from "@/components/articles/ArticleTrainer";
import { getArticleTrainerScope, resolveArticleTrainerPoint } from "@/lib/articles/scope";
import { getGrammarPoint } from "@/lib/grammar/curriculum";
import type { ArticleTrainerTab } from "@/lib/articles/types";

function parseTab(value: string | null): ArticleTrainerTab {
  if (value === "learn" || value === "quiz" || value === "practice") return value;
  return "learn";
}

function ArticlesPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const pointId = resolveArticleTrainerPoint(params.get("point"));
  const initialTab = parseTab(params.get("tab"));

  useEffect(() => {
    if (!pointId) router.replace("/grammar");
  }, [pointId, router]);

  if (!pointId) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
      </div>
    );
  }

  const point = getGrammarPoint(pointId);
  const scope = getArticleTrainerScope(pointId);

  return (
    <ArticleTrainer
      scope={scope}
      title={point?.title ?? "Artikel"}
      initialTab={initialTab}
    />
  );
}

export default function ArticlesTrainerPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Lädt...</p>
        </div>
      }
    >
      <ArticlesPageInner />
    </Suspense>
  );
}
