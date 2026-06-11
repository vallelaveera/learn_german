"use client";

import type { SpellingItem } from "@/lib/exercises/types";

interface Props {
  item: SpellingItem;
  index: number;
  total: number;
  value: string;
  feedback: "correct" | "wrong" | null;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function SpellingCard({ item, index, total, value, feedback, onChange, onSubmit, disabled }: Props) {
  return (
    <div style={{ width: "100%", maxWidth: 360 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        <span>{index + 1} / {total}</span>
        <span>Buchstabieren</span>
      </div>

      <div style={{
        textAlign: "center", padding: "24px 20px", marginBottom: 16,
        background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14,
      }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
          {item.context ?? "Wie am Telefon buchstabieren"}
        </p>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--text)", marginBottom: 8 }}>{item.label}</p>
        {item.hint && <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{item.hint}</p>}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Tippe die Buchstaben (z.B. M-U-E-L-L-E-R)</p>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && value.trim()) onSubmit(); }}
        disabled={disabled || !!feedback}
        placeholder="Buchstaben eingeben..."
        autoCapitalize="characters"
        style={{
          width: "100%", padding: "14px 16px", borderRadius: 10,
          border: feedback === "correct" ? "1.5px solid var(--green)" : feedback === "wrong" ? "1.5px solid var(--red)" : "0.5px solid var(--border)",
          background: "var(--surface)", color: "var(--text)", fontSize: 16,
          fontFamily: "var(--font-mono)", letterSpacing: "0.12em", marginBottom: 12,
        }}
      />

      {!feedback && (
        <button
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          style={{
            width: "100%", padding: "14px", borderRadius: 10, border: "none",
            background: value.trim() ? "var(--accent)" : "var(--border)",
            color: value.trim() ? "var(--bg)" : "var(--text-muted)",
            fontSize: 14, fontFamily: "var(--font-mono)", cursor: value.trim() ? "pointer" : "default",
          }}
        >
          Prüfen
        </button>
      )}

      {feedback === "correct" && <p style={{ textAlign: "center", fontSize: 13, color: "var(--green)" }}>Richtig!</p>}
      {feedback === "wrong" && (
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--red)" }}>
          Richtig wäre: <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>{item.answer}</span>
        </p>
      )}
    </div>
  );
}
