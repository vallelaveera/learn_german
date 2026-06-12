"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArticleTrainer } from "@/components/articles/ArticleTrainer";
import { getArticleTrainerScope, resolveArticleTrainerPoint } from "@/lib/articles/scope";
import { getGrammarPoint, GRAMMAR_LEVEL_IDS, type GrammarLevelId } from "@/lib/grammar/curriculum";
import type { ArticleTrainerTab } from "@/lib/articles/types";

function parseTab(value: string | null): ArticleTrainerTab {
  if (value === "learn" || value === "quiz" || value === "practice") return value;
  return "learn";
}

function parseLevel(value: string | null): GrammarLevelId | undefined {
  if (!value) return undefined;
  return (GRAMMAR_LEVEL_IDS as readonly string[]).includes(value)
    ? (value as GrammarLevelId)
    : undefined;
}

function ArticlesPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const pointId = resolveArticleTrainerPoint(params.get("point"));
  const levelOverride = parseLevel(params.get("level"));
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
  const scope = useMemo(
    () => getArticleTrainerScope(pointId, levelOverride),
    [pointId, levelOverride],
  );
  const title =
    pointId === "articles-full" ? "Artikel — alle Fälle" : point?.title ?? "Artikel";

  return (
    <ArticleTrainer
      scope={scope}
      title={title}
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
