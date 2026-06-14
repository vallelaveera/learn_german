"use client";

import Link from "next/link";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  GRAMMAR_CATEGORIES,
  getBaseTierExercises,
  getCategoryBlock,
  getTierItems,
  levelColor,
  levelLightColor,
  type GrammarCategory,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { getCategoryHref } from "@/lib/grammar/trainer-routes";
import type { TierExerciseCounts } from "@/hooks/useGrammarExercises";
import type { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";

interface GrammarCategoryGridProps {
  level: VerifiedLevel;
  progress: ReturnType<typeof useGrammarCatalogProgress>;
  exerciseCounts?: TierExerciseCounts;
}

const STATUS_LABEL: Record<string, string> = {
  EXISTS: "Üben →",
  PARTIAL: "Teilweise →",
  MISSING: "Lernen →",
};

export function GrammarCategoryGrid({ level, progress, exerciseCounts }: GrammarCategoryGridProps) {
  const color = levelColor(level);
  const light = levelLightColor(level);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginBottom: 16,
      }}
    >
      {GRAMMAR_CATEGORIES.map(cat => {
        const block = getCategoryBlock(level, cat);
        const cpBasic = progress.categoryProgress(cat, "basic");
        const cpAdv = progress.categoryProgress(cat, "advanced");
        const href = getCategoryHref(level, cat, "basic");
        const counts = exerciseCounts?.[cat];
        const basicSessions = counts?.basic ?? getBaseTierExercises(block, "basic").length;
        const advSessions = counts?.advanced ?? getBaseTierExercises(block, "advanced").length;
        const status = block.appCoverage.status;

        return (
          <Link
            key={cat}
            href={href}
            className="ui-card"
            style={{
              padding: "14px 12px",
              border: `1px solid ${color}33`,
              background: light,
              minHeight: 112,
              display: "flex",
              flexDirection: "column",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 22, marginBottom: 6 }}>{CATEGORY_EMOJI[cat]}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color,
                lineHeight: 1.25,
                marginBottom: 6,
              }}
            >
              {CATEGORY_LABELS[cat]}
            </span>

            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                lineHeight: 1.4,
                flex: 1,
                marginBottom: 8,
              }}
            >
              {getTierItems(level, cat, "basic").length + getTierItems(level, cat, "advanced").length} Themen
              <br />
              Basic {basicSessions} · Adv {advSessions} Übungen
              {status === "EXISTS" ? " · Trainer" : status === "PARTIAL" ? " · In Arbeit" : ""}
            </span>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>
                {STATUS_LABEL[status] ?? "Öffnen →"}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)" }}>
                B {cpBasic.done}/{cpBasic.total} · A {cpAdv.done}/{cpAdv.total}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: "#fff",
                  color,
                }}
              >
                {Math.round((cpBasic.pct + cpAdv.pct) / 2)}%
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
