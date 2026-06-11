"use client";

import { useEffect, useState } from "react";
import { LevelCardGrid } from "./LevelCardGrid";
import { GERMAN_LEVELS, type GermanLevel } from "@/lib/levels";

const PURPLE = "#7F77DD";

interface Props {
  open: boolean;
  currentLevel: string;
  onClose: () => void;
  onSave: (level: GermanLevel) => Promise<void>;
}

export function LevelBottomSheet({ open, currentLevel, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<GermanLevel | null>(
    GERMAN_LEVELS.includes(currentLevel as GermanLevel) ? (currentLevel as GermanLevel) : "A1"
  );
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(GERMAN_LEVELS.includes(currentLevel as GermanLevel) ? (currentLevel as GermanLevel) : "A1");
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open, currentLevel]);

  if (!open) return null;

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onSave(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        transition: "background 0.25s ease",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 390,
          background: "var(--bg)",
          borderRadius: "16px 16px 0 0",
          padding: "20px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.28s ease",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 400, margin: "0 0 6px", color: "var(--text)" }}>
          Dein Deutsch-Level
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Nach ein paar Gesprächen passen wir dein Level automatisch an.
        </p>

        <LevelCardGrid selected={selected} onSelect={setSelected} />

        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || saving}
          style={{
            width: "100%",
            minHeight: 48,
            marginTop: 18,
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: PURPLE,
            color: "#fff",
            fontSize: 15,
            fontWeight: 500,
            cursor: selected && !saving ? "pointer" : "not-allowed",
            opacity: selected && !saving ? 1 : 0.5,
            fontFamily: "var(--font-mono)",
          }}
        >
          {saving ? "Speichern..." : "Level speichern"}
        </button>
      </div>
    </div>
  );
}
