"use client";

import { markBetaWelcomeSeen } from "@/lib/feedback/storage";

interface BetaWelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onGiveFeedback?: () => void;
}

export function BetaWelcomeModal({ open, onClose, onGiveFeedback }: BetaWelcomeModalProps) {
  if (!open) return null;

  const dismiss = () => {
    markBetaWelcomeSeen();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="ui-card"
        style={{
          width: "100%",
          maxWidth: 340,
          padding: "22px 20px",
          border: "1.5px solid rgba(127, 119, 221, 0.35)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#7F77DD",
            margin: "0 0 8px",
          }}
        >
          Beta · Testphase
        </p>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 300, margin: "0 0 10px", color: "var(--text)" }}>
          Willkommen!
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 18px" }}>
          Du testest CallMeDaily in der frühen Phase. Bitte gib uns am Ende eines Anrufs Feedback — oder jederzeit unter Profil → Feedback.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {onGiveFeedback && (
            <button
              type="button"
              onClick={() => {
                dismiss();
                onGiveFeedback();
              }}
              style={{
                minHeight: 44,
                borderRadius: 10,
                border: "none",
                background: "#7F77DD",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Feedback geben
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            style={{
              minHeight: 44,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "#fff",
              color: "var(--text-muted)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
