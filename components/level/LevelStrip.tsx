"use client";

import { GERMAN_LEVELS, type GermanLevel } from "@/lib/levels";

const PURPLE = "#7F77DD";

interface Props {
  currentLevel: string;
  onSelect: (level: GermanLevel) => void;
}

export function LevelStrip({ currentLevel, onSelect }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 4,
        width: "100%",
        padding: "8px 4px",
        borderRadius: 10,
        border: "0.5px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      {GERMAN_LEVELS.map(level => {
        const selected = currentLevel === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onSelect(level)}
            style={{
              flex: 1,
              minHeight: 44,
              minWidth: 0,
              padding: selected ? "10px 4px 8px" : "8px 2px 6px",
              borderRadius: 8,
              border: selected ? `1.5px solid ${PURPLE}` : "1px solid transparent",
              background: selected ? "#EEEDFE" : "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: selected ? 18 : 12,
              fontWeight: selected ? 700 : 400,
              color: selected ? PURPLE : "#9ca3af",
              lineHeight: 1,
              transition: "font-size 0.15s ease, padding 0.15s ease, background 0.15s ease, border-color 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-pressed={selected}
            aria-label={`Level ${level}`}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}
