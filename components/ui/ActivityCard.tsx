import type { ReactNode } from "react";

type ActivityTone = "teal" | "sky" | "mint" | "blue" | "neutral";

const TONES: Record<ActivityTone, { bg: string; color: string; ring: string }> = {
  teal: { bg: "var(--accent-soft)", color: "var(--accent)", ring: "rgba(61, 184, 158, 0.25)" },
  sky: { bg: "var(--sky-soft)", color: "var(--sky)", ring: "rgba(110, 196, 232, 0.3)" },
  mint: { bg: "var(--mint-soft)", color: "#52b88a", ring: "rgba(125, 211, 168, 0.35)" },
  blue: { bg: "var(--brand-blue-soft)", color: "var(--brand-blue)", ring: "rgba(110, 196, 232, 0.25)" },
  neutral: { bg: "rgba(255,255,255,0.5)", color: "var(--text-muted)", ring: "rgba(61, 184, 158, 0.1)" },
};

interface ActivityCardProps {
  icon: ReactNode;
  label: string;
  subtext: string;
  onClick: () => void;
  tone?: ActivityTone;
  primary?: boolean;
}

export function ActivityCard({
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
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(255,255,255,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          {icon}
        </span>
        <span style={{ textAlign: "left", flex: 1 }}>
          <span style={{ display: "block", fontSize: 17, fontWeight: 600 }}>{label}</span>
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
      className="ui-card animate-fade-in"
      style={{
        width: "100%",
        minHeight: 76,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        cursor: "pointer",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: t.bg,
          color: t.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 4px 16px ${t.ring}, inset 0 1px 0 rgba(255,255,255,0.6)`,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{subtext}</span>
      </span>
    </button>
  );
}
