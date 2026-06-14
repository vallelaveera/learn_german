"use client";

import Link from "next/link";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  GRAMMAR_CATEGORIES,
  getTierItems,
  levelColor,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { getCategoryTrainerLink, getLearnHref } from "@/lib/grammar/trainer-routes";
import type { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";

interface GrammarLevelTOCProps {
  level: VerifiedLevel;
  tier: GrammarTier;
  progress: ReturnType<typeof useGrammarCatalogProgress>;
}

export function GrammarLevelTOC({ level, tier, progress }: GrammarLevelTOCProps) {
  const color = levelColor(level);
  const { levelProgress, categoryProgress } = progress;

  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, margin: 0, color }}>Inhaltsverzeichnis</h2>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
          {levelProgress.done}/{levelProgress.total} · {levelProgress.pct}%
        </span>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--border-light)",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${levelProgress.pct}%`,
            background: color,
            transition: "width 0.25s",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {GRAMMAR_CATEGORIES.map(cat => {
          const cp = categoryProgress(cat);
          const items = getTierItems(level, cat, tier);
          const trainer = getCategoryTrainerLink(level, cat);
          const href = trainer?.ready ? trainer.href : getLearnHref(level, cat, tier);

          return (
            <Link
              key={cat}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid var(--border-light)",
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ fontSize: 16 }}>{CATEGORY_EMOJI[cat]}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{CATEGORY_LABELS[cat]}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>
                  {items.length} Themen
                  {trainer && !trainer.ready ? " · bald" : ""}
                </span>
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: cp.pct >= 100 ? `${color}22` : "var(--bg-warm)",
                  color: cp.pct >= 100 ? color : "var(--text-muted)",
                }}
              >
                {cp.pct}%
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
