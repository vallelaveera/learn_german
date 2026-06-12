import type { CSSProperties } from "react";

export type ExerciseDirection = "en-de" | "de-en";

interface Props {
  value: ExerciseDirection;
  onChange: (value: ExerciseDirection) => void;
}

const pill = (active: boolean): CSSProperties => ({
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
  border: active ? "2px solid var(--accent-dim)" : "1px solid var(--border)",
  background: active ? "var(--accent-soft)" : "var(--surface)",
  color: active ? "var(--accent)" : "var(--text-muted)",
  boxShadow: active ? "var(--shadow-sm)" : "none",
  transition: "all 0.15s ease",
});

export function DirectionToggle({ value, onChange }: Props) {
  return (
    <div className="ui-card" style={{ display: "flex", gap: 6, width: "100%", maxWidth: 320, padding: 4 }}>
      <button type="button" onClick={() => onChange("en-de")} style={pill(value === "en-de")}>
        EN → DE
      </button>
      <button type="button" onClick={() => onChange("de-en")} style={pill(value === "de-en")}>
        DE → EN
      </button>
    </div>
  );
}
