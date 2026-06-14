"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GrammarExerciseSession } from "./GrammarExerciseSession";
import { useGrammarCatalogProgress } from "@/hooks/useGrammarCatalogProgress";
import {
  CATEGORY_LABELS,
  getCategoryBlock,
  levelColor,
  levelLightColor,
  type GrammarCategory,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";

interface GrammarVerifiedTrainerScreenProps {
  level: VerifiedLevel;
  category: GrammarCategory;
  title: string;
  subtitle?: string;
  backHref?: string;
}

export function GrammarVerifiedTrainerScreen({
  level,
  category,
  title,
  subtitle,
  backHref = "/grammar",
}: GrammarVerifiedTrainerScreenProps) {
  const block = getCategoryBlock(level, category);
  const color = levelColor(level);
  const light = levelLightColor(level);
  const { markExerciseDone } = useGrammarCatalogProgress(level, "basic");

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
          href={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          <ChevronLeft size={16} />
          Grammatik
        </Link>

        <p
          style={{
            fontSize: 10,
            color,
            fontWeight: 700,
            letterSpacing: "0.08em",
            margin: "0 0 6px",
            textTransform: "uppercase",
          }}
        >
          {level} · {CATEGORY_LABELS[category]}
        </p>
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.25 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>{subtitle}</p>
        )}

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color }}>Grundlagen</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--text)" }}>
            {block.basic.map((item, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{item}</li>
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
            onExerciseDone={idx => markExerciseDone(category, idx)}
          />
        </section>
      </div>
    </div>
  );
}
