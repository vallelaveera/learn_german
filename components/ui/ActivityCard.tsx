import type { ReactNode } from "react";

type ActivityTone = "orange" | "blue" | "yellow" | "green" | "purple" | "neutral";

const TONES: Record<ActivityTone, { bg: string; color: string; shadow: string }> = {
  orange: { bg: "rgba(255, 107, 53, 0.14)", color: "#FF6B35", shadow: "rgba(255, 107, 53, 0.3)" },
  blue: { bg: "rgba(74, 144, 226, 0.14)", color: "#4A90E2", shadow: "rgba(74, 144, 226, 0.3)" },
  yellow: { bg: "rgba(255, 209, 102, 0.2)", color: "#E89B0C", shadow: "rgba(244, 162, 97, 0.35)" },
  green: { bg: "rgba(56, 161, 105, 0.14)", color: "#38A169", shadow: "rgba(56, 161, 105, 0.3)" },
  purple: { bg: "rgba(128, 90, 213, 0.14)", color: "#805AD5", shadow: "rgba(128, 90, 213, 0.3)" },
  neutral: { bg: "#fff", color: "var(--text-muted)", shadow: "rgba(0,0,0,0.06)" },
};

interface ActivityCardProps {
  emoji?: string;
  icon?: ReactNode;
  label: string;
  subtext: string;
  onClick: () => void;
  tone?: ActivityTone;
  primary?: boolean;
}

export function ActivityCard({
  emoji,
  icon,
  label,
  subtext,
  onClick,
  tone = "neutral",
  primary = false,
}: ActivityCardProps) {
  const t = TONES[tone];

  if (primary) {
    return (
      <button type="button" onClick={onClick} className="ui-btn-primary animate-pop-in">
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(255,255,255,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: emoji ? 26 : undefined,
          }}
        >
          {emoji ?? icon}
        </span>
        <span style={{ textAlign: "left", flex: 1 }}>
          <span style={{ display: "block", fontSize: 17, fontWeight: 700 }}>{label}</span>
          <span style={{ display: "block", fontSize: 13, opacity: 0.92, fontWeight: 400, marginTop: 2 }}>
            {subtext}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-fade-in"
      style={{
        width: "100%",
        minHeight: 84,
        padding: "14px 16px",
        borderRadius: 22,
        border: "none",
        background: "#fff",
        boxShadow: `0 8px 28px ${t.shadow}, 0 2px 8px rgba(0,0,0,0.04)`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        cursor: "pointer",
        transition: "transform 0.12s ease",
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: t.bg,
          color: t.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: emoji ? 28 : undefined,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.6)`,
        }}
      >
        {emoji ?? icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>{subtext}</span>
      </span>
      <span style={{ fontSize: 20, color: "var(--text-dim)" }}>›</span>
    </button>
  );
}
