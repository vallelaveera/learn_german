"use client";

import { GERMAN_LEVELS, LEVEL_DESCRIPTIONS, type GermanLevel } from "@/lib/levels";

interface Props {
  selected: GermanLevel | null;
  onSelect: (level: GermanLevel) => void;
}

export function LevelCardGrid({ selected, onSelect }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        width: "100%",
      }}
    >
      {GERMAN_LEVELS.map(level => {
        const isSelected = selected === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onSelect(level)}
            className="ui-card"
            style={{
              minHeight: 84,
              padding: "14px 12px",
              border: isSelected ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.55)",
              background: isSelected ? "var(--accent-soft)" : "var(--surface)",
              cursor: "pointer",
              textAlign: "left",
              WebkitTapHighlightColor: "transparent",
              boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-glass)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: isSelected ? "var(--accent)" : "var(--text)", marginBottom: 4 }}>
              {level}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.35 }}>
              {LEVEL_DESCRIPTIONS[level]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
