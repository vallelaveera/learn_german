"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import type { FeedbackSource } from "@/lib/feedback/types";

interface FeedbackSheetProps {
  open: boolean;
  onClose: () => void;
  source: FeedbackSource;
  callMode?: string;
  /** When false, render inline (e.g. post-call report) instead of modal overlay */
  overlay?: boolean;
  onSubmitted?: () => void;
}

function StarRow({
  value,
  onChange,
  label,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>{label}</p>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const active = n <= value;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-label={`${n} von 5`}
              onClick={() => onChange(n)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: active ? "2px solid #7F77DD" : "1px solid var(--border)",
                background: active ? "rgba(127, 119, 221, 0.12)" : "#fff",
                cursor: disabled ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: active ? "#7F77DD" : "var(--text-dim)",
              }}
            >
              <Star size={20} fill={active ? "currentColor" : "none"} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FeedbackSheet({
  open,
  onClose,
  source,
  callMode,
  overlay = true,
  onSubmitted,
}: FeedbackSheetProps) {
  const [rating, setRating] = useState(0);
  const [wouldUseAgain, setWouldUseAgain] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    if (rating < 1 || wouldUseAgain < 1) {
      setError("Bitte beide Bewertungen auswählen (1–5 Sterne).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          wouldUseAgain,
          message,
          source,
          callMode,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Senden fehlgeschlagen — bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  };

  const body = (
    <div
      style={
        overlay
          ? {
              width: "100%",
              maxWidth: 390,
              maxHeight: "92dvh",
              background: "var(--bg)",
              borderRadius: "16px 16px 0 0",
              padding: "20px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)",
              overflowY: "auto",
            }
          : {
              padding: "16px",
              borderRadius: 14,
              background: "var(--surface)",
              border: "1px solid rgba(127, 119, 221, 0.25)",
            }
      }
    >
      {overlay && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300, margin: 0, color: "var(--text)" }}>
            Feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{ minWidth: 44, minHeight: 44, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
          >
            <X size={22} />
          </button>
        </div>
      )}

      {!overlay && (
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7F77DD", margin: "0 0 8px" }}>
          Dein Feedback
        </p>
      )}

      {done ? (
        <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, margin: 0, textAlign: "center", padding: "12px 0" }}>
          Danke! Dein Feedback hilft uns sehr.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 16px" }}>
            Wir testen das Produkt — bitte teile Verbesserungsvorschläge mit uns.
          </p>

          <StarRow value={rating} onChange={setRating} label="Wie war deine Erfahrung?" disabled={submitting} />
          <StarRow
            value={wouldUseAgain}
            onChange={setWouldUseAgain}
            label="Würdest du es wieder nutzen?"
            disabled={submitting}
          />

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              Was können wir verbessern? (optional)
            </span>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Fehler, Wünsche, Ideen…"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
                resize: "vertical",
                minHeight: 72,
                boxSizing: "border-box",
              }}
            />
          </label>

          {error && (
            <p style={{ fontSize: 12, color: "var(--red)", margin: "0 0 10px" }}>{error}</p>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            style={{
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              border: "none",
              background: "#7F77DD",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            {submitting ? "Senden…" : "Feedback senden"}
          </button>
        </>
      )}
    </div>
  );

  if (!overlay) return body;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {body}
    </div>
  );
}
