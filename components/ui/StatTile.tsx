import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: string;
}

export function StatTile({ label, value, icon, accent = "var(--accent)" }: StatTileProps) {
  return (
    <div className="ui-card ui-card-padded" style={{ textAlign: icon ? "left" : "center" }}>
      {icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--accent-soft)",
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          {icon}
        </div>
      )}
      <div className="ui-label" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, color: accent, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
