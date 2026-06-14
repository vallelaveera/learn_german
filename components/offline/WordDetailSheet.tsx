"use client";

import { OFFLINE_CATEGORY_LABELS, OFFLINE_LEVEL_COLORS } from "@/lib/offline/constants";
import type { OfflineWord } from "@/lib/offline/types";
import { OfflineIllustration } from "./OfflineIllustration";

interface WordDetailSheetProps {
  word: OfflineWord | null;
  learned?: boolean;
  onClose: () => void;
}

export function WordDetailSheet({ word, learned, onClose }: WordDetailSheetProps) {
  if (!word) return null;
  const color = OFFLINE_LEVEL_COLORS[word.level];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(45, 32, 24, 0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      }}
      onClick={onClose}
    >
      <div
        className="ui-card animate-slide-up"
        style={{ width: "100%", maxWidth: 390, padding: "18px 16px", maxHeight: "85dvh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <OfflineIllustration illustrationId={word.illustrationId} height={130} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: "3px 8px", borderRadius: 999 }}>
            {word.level}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-warm)", padding: "3px 8px", borderRadius: 999 }}>
            {OFFLINE_CATEGORY_LABELS[word.category] ?? word.category}
          </span>
          {learned && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", background: "var(--mint-soft)", padding: "3px 8px", borderRadius: 999 }}>
              Gelernt ✓
            </span>
          )}
        </div>
        <h2 className="ui-title-serif" style={{ fontSize: 24, margin: "0 0 6px" }}>
          {word.german}
        </h2>
        <p style={{ fontSize: 16, color: "var(--text-muted)", margin: "0 0 16px" }}>{word.english}</p>
        <div className="ui-card ui-card-padded" style={{ marginBottom: 12, background: "var(--bg-warm)" }}>
          <p className="ui-label" style={{ marginBottom: 6 }}>Beispiel</p>
          <p style={{ fontSize: 15, margin: "0 0 6px", lineHeight: 1.5 }}>{word.exampleDe}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{word.exampleEn}</p>
        </div>
        <button type="button" className="ui-btn-primary" onClick={onClose} style={{ minHeight: 48 }}>
          Schließen
        </button>
      </div>
    </div>
  );
}
