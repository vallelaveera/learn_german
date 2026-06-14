"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  getTierItems,
  levelColor,
  levelLightColor,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import type { TrainerLink } from "@/lib/grammar/trainer-routes";
import { GrammarTierToggle } from "./GrammarTierToggle";

interface GrammarCatalogScreenProps {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  title?: string;
  subtitle?: string;
  coverageNote?: string;
  theoryItems: string[];
  typicalMistakes?: string[];
  interactiveTrainer?: TrainerLink | null;
  exerciseCount?: number;
  children: ReactNode;
}

export function GrammarCatalogScreen({
  level,
  category,
  tier,
  title,
  subtitle,
  coverageNote,
  theoryItems,
  typicalMistakes = [],
  interactiveTrainer,
  exerciseCount,
  children,
}: GrammarCatalogScreenProps) {
  const [theoryOpen, setTheoryOpen] = useState(false);
  const color = levelColor(level);
  const light = levelLightColor(level);
  const heading = title ?? CATEGORY_LABELS[category];

  return (
    <ExerciseShell backHref="/grammar" showTabBar={false}>
      <div style={{ padding: "0 18px 24px" }}>
        <ExerciseBackLink href="/grammar" label="← Grammatik" />

        <header
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: light,
              border: `1px solid ${color}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            {CATEGORY_EMOJI[category]}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: light,
                }}
              >
                {level}
              </span>
            </div>
            <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.25, color }}>
              {heading}
            </h1>
            {(subtitle || coverageNote) && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                {subtitle ?? coverageNote}
              </p>
            )}
          </div>
        </header>

        <GrammarTierToggle level={level} category={category} tier={tier} color={color} light={light} />

        {interactiveTrainer && (
          <Link
            href={interactiveTrainer.href}
            className="ui-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 16px",
              marginBottom: 14,
              textDecoration: "none",
              border: `1px solid ${color}55`,
              background: `linear-gradient(135deg, ${light} 0%, #fff 100%)`,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color }}>
                {interactiveTrainer.label}
              </span>
              <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Interaktiver Trainer
              </span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>→</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setTheoryOpen(v => !v)}
          className="ui-card"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 14px",
            marginBottom: 14,
            border: `1px solid ${color}33`,
            background: "#fff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color }}>Theorie · {theoryItems.length} Punkte</span>
          {theoryOpen ? <ChevronUp size={18} color={color} /> : <ChevronDown size={18} color={color} />}
        </button>

        {theoryOpen && (
          <section
            style={{
              marginBottom: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: light,
              border: `1px solid ${color}33`,
            }}
          >
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
              {theoryItems.map((item, i) => (
                <li key={i} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ul>
            {typicalMistakes.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}28` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Typische Fehler
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "var(--text-muted)" }}>
                  {typicalMistakes.map((item, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section
          style={{
            padding: "16px",
            borderRadius: 16,
            background: "#fff",
            border: "1px solid var(--border-light)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color,
              margin: "0 0 14px",
            }}
          >
            Übungen · {tier === "basic" ? "Basic" : "Advanced"}{typeof exerciseCount === "number" ? ` · ${exerciseCount} Sitzungen` : ""}
          </p>
          {children}
        </section>
      </div>
    </ExerciseShell>
  );
}
