"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  progress: ReturnType<typeof useGrammarCatalogProgress>;
}

const TIER_STORAGE_KEY = "grammar_catalog_tiers_v1";

const STATUS_LABEL: Record<string, string> = {
  EXISTS: "Üben →",
  PARTIAL: "Teilweise →",
  MISSING: "Lernen →",
};

function defaultTiers(): Record<GrammarCategory, GrammarTier> {
  return {
    derDieDas: "basic",
    cases: "basic",
    tenses: "basic",
    prepositions: "basic",
  };
}

function loadTiers(level: VerifiedLevel): Record<GrammarCategory, GrammarTier> {
  if (typeof window === "undefined") return defaultTiers();
  try {
    const raw = localStorage.getItem(TIER_STORAGE_KEY);
    if (!raw) return defaultTiers();
    const parsed = JSON.parse(raw) as Record<string, GrammarTier>;
    const out = defaultTiers();
    for (const cat of GRAMMAR_CATEGORIES) {
      const key = `${level}:${cat}`;
      if (parsed[key] === "advanced") out[cat] = "advanced";
    }
    return out;
  } catch {
    return defaultTiers();
  }
}

function saveTiers(level: VerifiedLevel, tiers: Record<GrammarCategory, GrammarTier>) {
  const patch: Record<string, GrammarTier> = {};
  for (const cat of GRAMMAR_CATEGORIES) {
    patch[`${level}:${cat}`] = tiers[cat];
  }
  try {
    const raw = localStorage.getItem(TIER_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, GrammarTier>) : {};
    localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify({ ...existing, ...patch }));
  } catch {
    // ignore
  }
}

function CategoryTierToggle({
  tier,
  color,
  light,
  onChange,
}: {
  tier: GrammarTier;
  color: string;
  light: string;
  onChange: (tier: GrammarTier) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        padding: 3,
        borderRadius: 10,
        background: "#fff",
        border: `1px solid ${color}33`,
        marginBottom: 8,
      }}
      onClick={e => e.stopPropagation()}
    >
      {(["basic", "advanced"] as const).map(t => {
        const active = tier === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            style={{
              flex: 1,
              minHeight: 32,
              borderRadius: 8,
              border: "none",
              background: active ? light : "transparent",
              color: active ? color : "var(--text-muted)",
              fontSize: 10,
              fontWeight: active ? 700 : 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t === "basic" ? "Basic" : "Advanced"}
          </button>
        );
      })}
    </div>
  );
}

export function GrammarCategoryGrid({ level, progress }: GrammarCategoryGridProps) {
  const color = levelColor(level);
  const light = levelLightColor(level);
  const [tiers, setTiers] = useState<Record<GrammarCategory, GrammarTier>>(defaultTiers);

  useEffect(() => {
    setTiers(loadTiers(level));
  }, [level]);

  const setTier = (cat: GrammarCategory, tier: GrammarTier) => {
    setTiers(prev => {
      const next = { ...prev, [cat]: tier };
      saveTiers(level, next);
      return next;
    });
  };

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
        const tier = tiers[cat];
        const cp = progress.categoryProgress(cat, tier);
        const href = getCategoryHref(level, cat, tier);
        const topicCount = getTierItems(level, cat, tier).length;
        const status = block.appCoverage.status;

        return (
          <div
            key={cat}
            className="ui-card"
            style={{
              padding: "14px 12px",
              border: `1px solid ${color}33`,
              background: light,
              minHeight: 148,
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
                marginBottom: 8,
              }}
            >
              {CATEGORY_LABELS[cat]}
            </span>

            <CategoryTierToggle
              tier={tier}
              color={color}
              light={light}
              onChange={t => setTier(cat, t)}
            />

            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                lineHeight: 1.4,
                flex: 1,
                marginBottom: 8,
              }}
            >
              {topicCount} Themen
              {status === "EXISTS" ? " · Trainer" : status === "PARTIAL" ? " · In Arbeit" : ""}
            </span>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                href={href}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color,
                  textDecoration: "none",
                }}
              >
                {STATUS_LABEL[status] ?? "Öffnen →"}
              </Link>
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
          </div>
        );
      })}
    </div>
  );
}
