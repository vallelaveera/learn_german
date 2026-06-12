"use client";

import { useState, useRef, useEffect } from "react";
import { GERMAN_LEVELS, type GermanLevel } from "@/lib/levels";

interface Props {
  currentLevel: string;
  onSelect: (level: GermanLevel) => void;
}

export function LevelChip({ currentLevel, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`Deutsch-Level ${currentLevel}`}
        aria-expanded={open}
        style={{
          padding: "6px 12px",
          borderRadius: 20,
          border: "2px solid var(--accent-dim)",
          background: "var(--accent-soft)",
          color: "var(--accent)",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {currentLevel}
      </button>
      {open && (
        <div
          className="ui-card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            padding: 6,
            display: "flex",
            gap: 4,
            zIndex: 50,
            minWidth: 200,
            flexWrap: "wrap",
          }}
        >
          {GERMAN_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              onClick={() => {
                onSelect(level);
                setOpen(false);
              }}
              style={{
                flex: "1 1 28%",
                minHeight: 36,
                borderRadius: 10,
                border: currentLevel === level ? "2px solid var(--accent)" : "1px solid var(--border-light)",
                background: currentLevel === level ? "var(--accent-soft)" : "transparent",
                color: currentLevel === level ? "var(--accent)" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: currentLevel === level ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {level}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
