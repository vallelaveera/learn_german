"use client";

import { GERMAN_LEVELS } from "@/lib/levels";

const PURPLE = "#7F77DD";

interface Props {
  currentLevel: string;
  onTap: () => void;
}

export function LevelStrip({ currentLevel, onTap }: Props) {
  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        width: "100%",
        minHeight: 44,
        padding: "10px 8px",
        borderRadius: 10,
        border: "0.5px solid var(--border)",
        background: "var(--surface)",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", gap: 6 }}>
        {GERMAN_LEVELS.map((level, i) => (
          <span key={level} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: currentLevel === level ? 700 : 400,
                color: currentLevel === level ? PURPLE : "#9ca3af",
                fontFamily: "var(--font-mono)",
              }}
            >
              {level}
            </span>
            {i < GERMAN_LEVELS.length - 1 && (
              <span style={{ color: "#d1d5db", fontSize: 11 }}>—</span>
            )}
          </span>
        ))}
      </div>
    </button>
  );
}
