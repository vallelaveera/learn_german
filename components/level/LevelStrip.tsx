"use client";

import { GERMAN_LEVELS, type GermanLevel } from "@/lib/levels";

interface Props {
  currentLevel: string;
  onSelect: (level: GermanLevel) => void;
}

export function LevelStrip({ currentLevel, onSelect }: Props) {
  return (
    <div
      className="ui-card"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 4,
        width: "100%",
        padding: 6,
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
              borderRadius: 12,
              border: selected ? "2px solid var(--accent)" : "2px solid transparent",
              background: selected ? "var(--accent-soft)" : "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: selected ? 17 : 12,
              fontWeight: selected ? 700 : 500,
              color: selected ? "var(--accent)" : "var(--text-dim)",
              lineHeight: 1,
              transition: "all 0.15s ease",
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
