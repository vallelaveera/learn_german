"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OFFLINE_LEVEL_COLORS } from "@/lib/offline/constants";
import type { OfflineWord } from "@/lib/offline/types";
import { OfflineIllustration } from "./OfflineIllustration";

interface OfflineRevealFlashcardProps {
  word: OfflineWord;
  index: number;
  total: number;
  onKnown: () => void;
  onPractice: () => void;
}

export function OfflineRevealFlashcard({
  word,
  index,
  total,
  onKnown,
  onPractice,
}: OfflineRevealFlashcardProps) {
  const [revealed, setRevealed] = useState(false);
  const color = OFFLINE_LEVEL_COLORS[word.level];
  const progress = ((index + 1) / total) * 100;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span className="ui-label">Karte {index + 1} / {total}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: "3px 8px", borderRadius: 999 }}>
            {word.level}
          </span>
        </div>
        <div className="ui-progress-track">
          <div className="ui-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <OfflineIllustration illustrationId={word.illustrationId} height={140} />

      <div className="ui-card" style={{ textAlign: "center", padding: "22px 18px", marginBottom: 14 }}>
        <p className="ui-label" style={{ marginBottom: 8 }}>English</p>
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{word.english}</p>
      </div>

      {!revealed ? (
        <button
          type="button"
          className="ui-btn-primary"
          onClick={() => setRevealed(true)}
          style={{ minHeight: 52, marginBottom: 10 }}
        >
          Antwort anzeigen
        </button>
      ) : (
        <div className="ui-card ui-card-padded animate-pop-in" style={{ marginBottom: 14, border: `1px solid ${color}44` }}>
          <p className="ui-label" style={{ marginBottom: 6 }}>Deutsch</p>
          <p className="ui-title-serif" style={{ fontSize: 24, margin: "0 0 8px", color }}>
            {word.german}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>{word.exampleDe}</p>
        </div>
      )}

      {revealed && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={onPractice}
            className="ui-btn-ghost"
            style={{ minHeight: 52, color: "var(--red)", borderColor: "rgba(224,90,74,0.35)" }}
          >
            Noch üben
          </button>
          <button type="button" onClick={onKnown} className="ui-btn-primary" style={{ minHeight: 52, background: "var(--green)", borderColor: "var(--green)" }}>
            Gewusst ✓
          </button>
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", marginTop: 12 }}>
        Tippen zum Aufdecken · danach bewerten
      </p>
    </div>
  );
}

export function OfflineFlashcardNav({
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
      <button type="button" disabled={!canPrev} onClick={onPrev} className="ui-btn-ghost" style={{ flex: 1, minHeight: 48, opacity: canPrev ? 1 : 0.4 }}>
        <ChevronLeft size={18} /> Zurück
      </button>
      <button type="button" disabled={!canNext} onClick={onNext} className="ui-btn-ghost" style={{ flex: 1, minHeight: 48, opacity: canNext ? 1 : 0.4 }}>
        Weiter <ChevronRight size={18} />
      </button>
    </div>
  );
}
