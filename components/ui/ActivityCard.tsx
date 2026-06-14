import type { ReactNode } from "react";

type ActivityTone = "orange" | "blue" | "yellow" | "green" | "purple" | "teal" | "neutral";

const TONES: Record<ActivityTone, { bg: string; color: string; shadow: string }> = {
  orange: { bg: "rgba(255, 107, 53, 0.14)", color: "#FF6B35", shadow: "rgba(255, 107, 53, 0.3)" },
  blue: { bg: "rgba(74, 144, 226, 0.14)", color: "#4A90E2", shadow: "rgba(74, 144, 226, 0.3)" },
  yellow: { bg: "rgba(255, 209, 102, 0.2)", color: "#E89B0C", shadow: "rgba(244, 162, 97, 0.35)" },
  green: { bg: "rgba(56, 161, 105, 0.14)", color: "#38A169", shadow: "rgba(56, 161, 105, 0.3)" },
  purple: { bg: "rgba(128, 90, 213, 0.14)", color: "#805AD5", shadow: "rgba(128, 90, 213, 0.3)" },
  teal: { bg: "rgba(14, 116, 144, 0.14)", color: "#0e7490", shadow: "rgba(14, 116, 144, 0.3)" },
  neutral: { bg: "#fff", color: "var(--text-muted)", shadow: "rgba(0,0,0,0.06)" },
};

interface ActivityCardProps {
  emoji?: string;
  icon?: ReactNode;
  label: string;
  subtext: string;
  onClick: () => void;
  tone?: ActivityTone;
  compact?: boolean;
}

export function ActivityCard({
  emoji,
  icon,
  label,
  subtext,
  onClick,
  tone = "neutral",
  compact = false,
}: ActivityCardProps) {
  const t = TONES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-fade-in"
      style={{
        width: "100%",
        minHeight: compact ? 62 : 84,
        padding: compact ? "10px 12px" : "14px 16px",
        borderRadius: compact ? 18 : 22,
        border: "none",
        background: "#fff",
        boxShadow: `0 8px 28px ${t.shadow}, 0 2px 8px rgba(0,0,0,0.04)`,
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 14,
        textAlign: "left",
        cursor: "pointer",
        transition: "transform 0.12s ease",
        flex: compact ? "1 1 0" : undefined,
        minWidth: 0,
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span
        style={{
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: 8,
          background: t.bg,
          color: t.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: emoji ? (compact ? 22 : 28) : undefined,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
        }}
      >
        {emoji ?? icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: compact ? 14 : 16, fontWeight: 700, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: compact ? 11 : 13, color: "var(--text-muted)", marginTop: compact ? 2 : 3, lineHeight: 1.35 }}>{subtext}</span>
      </span>
      <span style={{ fontSize: compact ? 18 : 20, color: "var(--text-dim)" }}>›</span>
    </button>
  );
}
