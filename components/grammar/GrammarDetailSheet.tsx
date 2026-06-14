"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  practiceTypeLabel,
  visiblePracticeTypes,
  type GrammarLevel,
  type GrammarPoint,
} from "@/lib/grammar/curriculum";
import { getGrammarFlashcardsHref } from "@/lib/grammar/highlight";
import { GrammarHighlightedSentence } from "@/components/grammar/GrammarHighlightedSentence";
import { supportsArticlePicker } from "@/lib/articles/scope";

interface GrammarDetailSheetProps {
  point: GrammarPoint;
  level: GrammarLevel;
  onClose: () => void;
}

export function GrammarDetailSheet({ point, level, onClose }: GrammarDetailSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const hasArticlePicker = supportsArticlePicker(point.id);
  const hasFlashcards = point.practiceTypes.includes("flashcard");

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const startArticleTrainer = () => {
    onClose();
    router.push(`/grammar/articles?point=${encodeURIComponent(point.id)}`);
  };

  const startFlashcards = () => {
    onClose();
    router.push(getGrammarFlashcardsHref(point.id, level.id));
  };

  if (!mounted) return null;

  const practiceTypes = visiblePracticeTypes(point.practiceTypes);

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 180,
          background: "rgba(0,0,0,0.45)",
          border: "none",
          cursor: "pointer",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "var(--shell-bottom-tab)",
          transform: "translateX(-50%)",
          zIndex: 190,
          width: "100%",
          maxWidth: 390,
          maxHeight: "min(78dvh, calc(100dvh - 82px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))",
          background: "var(--bg)",
          borderRadius: "16px 16px 0 0",
          padding: "18px 18px 18px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: level.color, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 6px", textTransform: "uppercase" }}>
              {level.id} · {point.english}
            </p>
            <h2 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px", lineHeight: 1.25 }}>
              {point.title}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{point.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              minWidth: 44,
              minHeight: 44,
              border: "none",
              background: "var(--surface)",
              borderRadius: 12,
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="ui-card ui-card-padded" style={{ marginBottom: 14, background: level.lightColor }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
            Erklärung
          </p>
          <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.55, margin: 0 }}>
            {point.explanation}
          </p>
        </div>

        <div className="ui-card ui-card-padded" style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
            Beispiel
          </p>
          <GrammarHighlightedSentence
            sentence={point.example.de}
            subtitle={point.subtitle}
            size="md"
          />
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
            {point.example.en}
          </p>
        </div>

        {hasFlashcards && (
          <button
            type="button"
            onClick={startFlashcards}
            style={{
              width: "100%",
              minHeight: 48,
              marginBottom: hasArticlePicker ? 10 : 16,
              borderRadius: 12,
              border: `1px solid ${level.color}55`,
              background: "#fff",
              color: level.color,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            Karteikarten — Satz für Satz
          </button>
        )}

        {hasArticlePicker && (
          <button
            type="button"
            onClick={startArticleTrainer}
            style={{
              width: "100%",
              minHeight: 48,
              marginBottom: 16,
              borderRadius: 12,
              border: "none",
              background: level.color,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            Artikel wählen — Übung starten
          </button>
        )}

        {practiceTypes.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
              Übungstypen
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {practiceTypes.map(type => {
                const isArticle = type === "article-picker" && hasArticlePicker;
                const isFlashcard = type === "flashcard" && hasFlashcards;
                if (isArticle) {
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={startArticleTrainer}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: level.lightColor,
                        border: `1px solid ${level.color}44`,
                        color: level.color,
                        cursor: "pointer",
                      }}
                    >
                      {practiceTypeLabel(type)}
                    </button>
                  );
                }
                if (isFlashcard) {
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={startFlashcards}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: level.lightColor,
                        border: `1px solid ${level.color}44`,
                        color: level.color,
                        cursor: "pointer",
                      }}
                    >
                      {practiceTypeLabel(type)}
                    </button>
                  );
                }
                return (
                  <span
                    key={type}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "var(--surface)",
                      border: "1px solid var(--border-light)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {practiceTypeLabel(type)}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
