"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarExerciseSession } from "@/components/grammar/catalog/GrammarExerciseSession";
import { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import {
  CATEGORY_LABELS,
  GRAMMAR_CATEGORIES,
  VERIFIED_LEVELS,
  getCategoryBlock,
  getTierItems,
  levelColor,
  levelLightColor,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { getInteractiveTrainerLink } from "@/lib/grammar/trainer-routes";

function LearnPageInner() {
  const searchParams = useSearchParams();
  const levelParam = searchParams.get("level") as VerifiedLevel | null;
  const categoryParam = searchParams.get("category") as GrammarCategory | null;
  const tierParam = (searchParams.get("tier") as GrammarTier | null) ?? "basic";

  const level: VerifiedLevel =
    levelParam && VERIFIED_LEVELS.includes(levelParam) ? levelParam : "A1";
  const category: GrammarCategory =
    categoryParam && GRAMMAR_CATEGORIES.includes(categoryParam) ? categoryParam : "cases";
  const tier: GrammarTier = tierParam === "advanced" ? "advanced" : "basic";

  const block = getCategoryBlock(level, category);
  const color = levelColor(level);
  const light = levelLightColor(level);
  const items = getTierItems(level, category, tier);
  const interactiveTrainer = getInteractiveTrainerLink(level, category, tier);
  const progress = useGrammarCatalogProgress(level, tier);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px calc(env(safe-area-inset-bottom, 0px) + 88px)",
      }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <Link
          href="/grammar"
          style={{
            display: "inline-flex",
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          ← Grammatik
        </Link>

        <p style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 6px", textTransform: "uppercase" }}>
          {level} · {tier === "basic" ? "Grundlagen" : "Fortgeschritten"}
        </p>
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px" }}>
          {CATEGORY_LABELS[category]}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
          {block.appCoverage.notes ?? block.appCoverage.status}
        </p>

        {interactiveTrainer && (
          <Link
            href={interactiveTrainer.href}
            className="ui-card"
            style={{
              display: "block",
              padding: "12px 14px",
              marginBottom: 16,
              textDecoration: "none",
              border: `1px solid ${color}44`,
              background: light,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{interactiveTrainer.label}</span>
            <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              Interaktiver Trainer →
            </span>
          </Link>
        )}

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color }}>
            {tier === "basic" ? "Basic" : "Advanced"}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55 }}>
            {items.map((item, i) => (
              <li key={i} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
        </section>

        {block.typicalMistakes.length > 0 && (
          <section
            style={{
              marginBottom: 20,
              padding: "12px 14px",
              borderRadius: 12,
              background: light,
              border: `1px solid ${color}33`,
            }}
          >
            <h2 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px", color }}>Typische Fehler</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)" }}>
              {block.typicalMistakes.map((item, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px", color }}>Übungen</h2>
          <GrammarExerciseSession
            exercises={block.exercises}
            levelColor={color}
            onExerciseDone={idx => progress.markExerciseDone(category, idx)}
            onSessionStart={() => progress.markTrainerVisited(category)}
          />
        </section>
      </div>
    </div>
  );
}

export default function GrammarLearnPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}>
      <LearnPageInner />
    </Suspense>
  );
}
