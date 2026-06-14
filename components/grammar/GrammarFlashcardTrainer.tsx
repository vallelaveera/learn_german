"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GrammarHighlightedSentence } from "@/components/grammar/GrammarHighlightedSentence";
import {
  parseGrammarFocusTerms,
  splitGrammarExampleSentences,
} from "@/lib/grammar/highlight";
import type { GrammarLevelId, GrammarPointWithLevel } from "@/lib/grammar/curriculum";

interface GrammarFlashcardTrainerProps {
  point: GrammarPointWithLevel;
}

export function GrammarFlashcardTrainer({ point }: GrammarFlashcardTrainerProps) {
  const sentences = useMemo(
    () => splitGrammarExampleSentences(point.example.de, point.example.en),
    [point.example.de, point.example.en],
  );
  const focusTerms = useMemo(() => parseGrammarFocusTerms(point.subtitle), [point.subtitle]);
  const [index, setIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);

  const current = sentences[index];
  const progress = ((index + 1) / sentences.length) * 100;
  const levelColor = getLevelColor(point.level);

  const goTo = (next: number) => {
    setIndex(next);
    setShowEnglish(false);
  };

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
            color: levelColor,
            fontWeight: 700,
            letterSpacing: "0.08em",
            margin: "0 0 6px",
            textTransform: "uppercase",
          }}
        >
          {point.level} · Karteikarten
        </p>
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.25 }}>
          {point.title}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
          {point.subtitle}
        </p>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="ui-label">
              Satz {index + 1} / {sentences.length}
            </span>
          </div>
          <div className="ui-progress-track">
            <div className="ui-progress-fill" style={{ width: `${progress}%`, background: levelColor }} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEnglish(v => !v)}
          className="ui-card ui-card-padded"
          style={{
            width: "100%",
            textAlign: "left",
            border: `1px solid ${levelColor}33`,
            background: "#fff",
            cursor: "pointer",
            marginBottom: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <GrammarHighlightedSentence
            sentence={current.de}
            subtitle={point.subtitle}
            size="lg"
          />

          {showEnglish && current.en && (
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                fontStyle: "italic",
                lineHeight: 1.55,
                margin: "14px 0 0",
                paddingTop: 14,
                borderTop: "1px solid var(--border-light)",
              }}
            >
              {current.en}
            </p>
          )}

          <p style={{ fontSize: 11, color: levelColor, fontWeight: 600, margin: "14px 0 0" }}>
            {showEnglish ? "Deutsch anzeigen ↑" : "English anzeigen ↓"}
          </p>
        </button>

        {focusTerms.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 18px" }}>
            Unterstrichen: {focusTerms.join(", ")}
          </p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            style={navButtonStyle(index === 0, levelColor)}
          >
            <ChevronLeft size={16} />
            Zurück
          </button>
          <button
            type="button"
            disabled={index >= sentences.length - 1}
            onClick={() => goTo(index + 1)}
            style={{ ...navButtonStyle(index >= sentences.length - 1, levelColor), flex: 1 }}
          >
            Weiter
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function getLevelColor(level: GrammarLevelId): string {
  const colors: Record<GrammarLevelId, string> = {
    A1: "#1D9E75",
    A2: "#378ADD",
    B1: "#6B4FA0",
    B2: "#085041",
    C1: "#C0392B",
  };
  return colors[level] ?? "var(--accent)";
}

function navButtonStyle(disabled: boolean, color: string): CSSProperties {
  return {
    minHeight: 48,
    padding: "0 16px",
    borderRadius: 12,
    border: `1px solid ${disabled ? "var(--border-light)" : `${color}44`}`,
    background: disabled ? "var(--surface)" : "#fff",
    color: disabled ? "var(--text-dim)" : color,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}
