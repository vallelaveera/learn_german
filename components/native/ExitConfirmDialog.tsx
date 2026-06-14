"use client";

interface ExitConfirmDialogProps {
  open: boolean;
  onStay: () => void;
  onExit: () => void;
}

export function ExitConfirmDialog({ open, onStay, onExit }: ExitConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "16px",
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        background: "rgba(45, 32, 24, 0.45)",
      }}
      onClick={onStay}
    >
      <div
        className="ui-card animate-slide-up"
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "20px 18px",
          background: "#fff",
        }}
        onClick={e => e.stopPropagation()}
      >
        <p id="exit-dialog-title" style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>
          App beenden?
        </p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 18px", lineHeight: 1.45 }}>
          Möchtest du CallMeDaily wirklich schließen?
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="ui-btn-ghost"
            onClick={onStay}
            style={{ flex: 1, minHeight: 48 }}
          >
            Weiter
          </button>
          <button
            type="button"
            className="ui-btn-primary"
            onClick={onExit}
            style={{ flex: 1, minHeight: 48 }}
          >
            Beenden
          </button>
        </div>
      </div>
    </div>
  );
}
