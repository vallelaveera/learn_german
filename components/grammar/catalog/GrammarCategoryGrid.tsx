"use client";

import Link from "next/link";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  GRAMMAR_CATEGORIES,
  getCategoryBlock,
  getTierItems,
  levelColor,
  levelLightColor,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { getCategoryHref } from "@/lib/grammar/trainer-routes";
import type { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";

interface GrammarCategoryGridProps {
  level: VerifiedLevel;
  tier: GrammarTier;
  progress: ReturnType<typeof useGrammarCatalogProgress>;
}

const STATUS_LABEL: Record<string, string> = {
  EXISTS: "Üben →",
  PARTIAL: "Teilweise →",
  MISSING: "Lernen →",
};

function categorySubtitle(level: VerifiedLevel, cat: GrammarCategory, tier: GrammarTier): string {
  const block = getCategoryBlock(level, cat);
  const n = getTierItems(level, cat, tier).length;
  const status = block.appCoverage.status;
  if (status === "EXISTS") return `${n} Themen · Trainer verfügbar`;
  if (status === "PARTIAL") return `${n} Themen · In Arbeit`;
  return `${n} Themen · Lernmodul`;
}

export function GrammarCategoryGrid({ level, tier, progress }: GrammarCategoryGridProps) {
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
        const cp = progress.categoryProgress(cat);
        const href = getCategoryHref(level, cat, tier);

        return (
          <Link
            key={cat}
            href={href}
            className="ui-card"
            style={{
              padding: "14px 12px",
              textDecoration: "none",
              border: `1px solid ${color}33`,
              background: light,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: 22, marginBottom: 6 }}>{CATEGORY_EMOJI[cat]}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color,
                lineHeight: 1.25,
                marginBottom: 4,
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
              {categorySubtitle(level, cat, tier)}
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color }}>
                {STATUS_LABEL[block.appCoverage.status] ?? "Öffnen →"}
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
                {cp.pct}%
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
