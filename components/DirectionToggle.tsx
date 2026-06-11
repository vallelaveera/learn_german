import type { CSSProperties } from "react";

export type ExerciseDirection = "en-de" | "de-en";

interface Props {
  value: ExerciseDirection;
  onChange: (value: ExerciseDirection) => void;
}

const pill = (active: boolean): CSSProperties => ({
  flex: 1,
  padding: "7px 10px",
  borderRadius: 8,
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.05em",
  cursor: "pointer",
  border: active ? "0.5px solid var(--accent-dim)" : "0.5px solid var(--border)",
  background: active ? "var(--accent-glow)" : "var(--surface)",
  color: active ? "var(--accent)" : "var(--text-muted)",
});

export function DirectionToggle({ value, onChange }: Props) {
  return (
    <div style={{ display: "flex", gap: 6, width: "100%", maxWidth: 300 }}>
      <button type="button" onClick={() => onChange("en-de")} style={pill(value === "en-de")}>
        EN → DE
      </button>
      <button type="button" onClick={() => onChange("de-en")} style={pill(value === "de-en")}>
        DE → EN
      </button>
    </div>
  );
}
