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

function BilingualText({ de, en, style }: { de: string; en: string; style?: React.CSSProperties }) {
  return (
    <span style={style}>
      <span style={{ display: "block" }}>{de}</span>
      <span style={{ display: "block", fontSize: "0.92em", fontWeight: 400, color: "var(--text-muted)", marginTop: 2 }}>
        {en}
      </span>
    </span>
  );
}

function StarRow({
  value,
  onChange,
  labelDe,
  labelEn,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  labelDe: string;
  labelEn: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>
        <BilingualText de={labelDe} en={labelEn} />
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const active = n <= value;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-label={`${n} of 5 · ${n} von 5`}
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
      setError("Bitte beide Bewertungen auswählen (1–5 Sterne). · Please rate both questions (1–5 stars).");
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
      setError("Senden fehlgeschlagen — bitte erneut versuchen. · Could not send — please try again.");
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
              padding: "20px 18px 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : {
              padding: "16px",
              borderRadius: 14,
              background: "var(--surface)",
              border: "1px solid rgba(127, 119, 221, 0.25)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "45dvh",
              overflow: "hidden",
              marginBottom: 10,
            }
      }
    >
      {overlay && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "20px 18px 0", flexShrink: 0 }}>
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
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7F77DD", margin: "0 0 8px", flexShrink: 0 }}>
          Dein Feedback · Your feedback
        </p>
      )}

      {done ? (
        <p
          style={{
            fontSize: 14,
            color: "var(--text)",
            lineHeight: 1.6,
            margin: 0,
            textAlign: "center",
            padding: overlay ? "12px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)" : "12px 0",
          }}
        >
          <BilingualText
            de="Danke! Dein Feedback hilft uns sehr."
            en="Thank you! Your feedback helps us a lot."
          />
        </p>
      ) : (
        <>
          <div
            style={
              overlay
                ? {
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "0 18px",
                  }
                : {
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                  }
            }
          >
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 16px" }}>
              <BilingualText
                de="Wir testen das Produkt — bitte teile Verbesserungsvorschläge mit uns."
                en="We're testing the product — please share improvement suggestions with us."
              />
            </p>

            <StarRow
              value={rating}
              onChange={setRating}
              labelDe="Wie war deine Erfahrung?"
              labelEn="How was your experience?"
              disabled={submitting}
            />
            <StarRow
              value={wouldUseAgain}
              onChange={setWouldUseAgain}
              labelDe="Würdest du es wieder nutzen?"
              labelEn="Would you use this again?"
              disabled={submitting}
            />

            <label style={{ display: "block", marginBottom: overlay ? 16 : 14 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                <BilingualText
                  de="Was können wir verbessern? (optional)"
                  en="What can we improve? (optional)"
                />
              </span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="Fehler, Wünsche, Ideen… · Bugs, wishes, ideas…"
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
          </div>

          <div
            style={{
              flexShrink: 0,
              padding: overlay
                ? "12px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)"
                : "12px 0 0",
              borderTop: overlay ? "1px solid var(--border)" : undefined,
              background: overlay ? "var(--bg)" : undefined,
            }}
          >
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
              {submitting ? "Senden… · Sending…" : "Feedback senden · Send feedback"}
            </button>
          </div>
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
