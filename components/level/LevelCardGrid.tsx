"use client";

import { GERMAN_LEVELS, LEVEL_DESCRIPTIONS, type GermanLevel } from "@/lib/levels";

const PURPLE = "#7F77DD";

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
            style={{
              minHeight: 80,
              padding: "14px 12px",
              borderRadius: 12,
              border: isSelected ? `1.5px solid ${PURPLE}` : "0.5px solid #e0e0e0",
              background: isSelected ? "#EEEDFE" : "#fff",
              cursor: "pointer",
              textAlign: "left",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: isSelected ? PURPLE : "var(--text)", marginBottom: 4 }}>
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
