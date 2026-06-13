"use client";

import type { GenderTabTheme } from "@/lib/gender/theme";

interface GraduationModalProps {
  theme: GenderTabTheme;
  accuracy: number;
  onUnlock: () => void;
  onKeepWarmups: () => void;
}

export function GraduationModal({
  theme,
  accuracy,
  onUnlock,
  onKeepWarmups,
}: GraduationModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="graduation-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(45, 32, 24, 0.45)",
      }}
    >
      <div
        className="ui-card"
        style={{
          maxWidth: 340,
          width: "100%",
          padding: "28px 22px 22px",
          textAlign: "center",
          border: `2px solid ${theme.tbd}`,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎓</div>
        <h2
          id="graduation-title"
          style={{ fontSize: 20, fontWeight: 800, color: theme.tc, margin: "0 0 8px" }}
        >
          Sentence graduate!
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 6px", lineHeight: 1.5 }}>
          You scored <strong style={{ color: theme.tc }}>{accuracy}%</strong> on mnemonic sentences.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          You&apos;ve mastered the mnemonic sentences. Warm-ups are now optional.
        </p>
        <button
          type="button"
          onClick={onUnlock}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 14,
            border: "none",
            background: theme.tc,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          Unlock pure practice
        </button>
        <button
          type="button"
          onClick={onKeepWarmups}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 14,
            border: `1.5px solid ${theme.tbd}`,
            background: "transparent",
            color: theme.tc,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Keep doing warm-ups
        </button>
      </div>
    </div>
  );
}
