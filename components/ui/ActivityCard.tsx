import type { ReactNode } from "react";

type ActivityTone = "purple" | "orange" | "green" | "blue" | "neutral";

const TONES: Record<ActivityTone, { bg: string; color: string }> = {
  purple: { bg: "var(--accent-soft)", color: "var(--accent)" },
  orange: { bg: "var(--brand-orange-soft)", color: "var(--brand-orange)" },
  green: { bg: "var(--brand-green-soft)", color: "var(--brand-green)" },
  blue: { bg: "var(--brand-blue-soft)", color: "var(--brand-blue)" },
  neutral: { bg: "var(--border-light)", color: "var(--text-muted)" },
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
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(255,255,255,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span style={{ textAlign: "left", flex: 1 }}>
          <span style={{ display: "block", fontSize: 17, fontWeight: 600 }}>{label}</span>
          <span style={{ display: "block", fontSize: 13, opacity: 0.9, fontWeight: 400, marginTop: 2 }}>
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
        minHeight: 72,
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
          width: 44,
          height: 44,
          borderRadius: 14,
          background: t.bg,
          color: t.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
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
