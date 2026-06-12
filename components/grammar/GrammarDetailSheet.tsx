"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, X } from "lucide-react";
import {
  buildGrammarCallContext,
  GRAMMAR_CALL_STORAGE_KEY,
  practiceTypeLabel,
  type GrammarLevel,
  type GrammarPoint,
} from "@/lib/grammar/curriculum";

interface GrammarDetailSheetProps {
  point: GrammarPoint;
  level: GrammarLevel;
  onClose: () => void;
}

export function GrammarDetailSheet({ point, level, onClose }: GrammarDetailSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const practiceWithMaya = () => {
    sessionStorage.setItem(
      GRAMMAR_CALL_STORAGE_KEY,
      JSON.stringify(buildGrammarCallContext(point, level.id)),
    );
    sessionStorage.setItem("maya_grammar_focus", point.id);
    localStorage.setItem("maya_voice", "soniox");
    router.push(`/call?grammar=${encodeURIComponent(point.id)}`);
  };

  if (!mounted) return null;

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
          bottom: 0,
          transform: "translateX(-50%)",
          zIndex: 190,
          width: "100%",
          maxWidth: 390,
          maxHeight: "88dvh",
          background: "var(--bg)",
          borderRadius: "16px 16px 0 0",
          padding: "18px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)",
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
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--text)", lineHeight: 1.5, margin: "0 0 6px" }}>
            {point.example.de}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
            {point.example.en}
          </p>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
          Übungstypen
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {point.practiceTypes.map(type => (
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
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={practiceWithMaya}
            className="ui-btn-primary"
            style={{ width: "100%", minHeight: 48, justifyContent: "center", gap: 8 }}
          >
            <Phone size={18} />
            Mit Maya üben
          </button>
          {point.practiceTypes
            .filter(type => type !== "call-practice")
            .map(type => (
              <button
                key={type}
                type="button"
                disabled
                style={{
                  width: "100%",
                  minHeight: 44,
                  borderRadius: 12,
                  border: "1px solid var(--border-light)",
                  background: "var(--surface)",
                  color: "var(--text-dim)",
                  fontSize: 13,
                  cursor: "not-allowed",
                  opacity: 0.75,
                }}
              >
                {practiceTypeLabel(type)} — bald verfügbar
              </button>
            ))}
        </div>
      </div>
    </>,
    document.body,
  );
}
