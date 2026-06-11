"use client";

import type { BinaryCard } from "@/lib/exercises/types";

interface Props {
  card: BinaryCard;
  index: number;
  total: number;
  feedback: "correct" | "wrong" | null;
  onChoose: (option: "A" | "B") => void;
  disabled?: boolean;
}

export function BinaryFlashcard({ card, index, total, feedback, onChoose, disabled }: Props) {
  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        <span>{index + 1} / {total}</span>
        {card.level && <span style={{ color: "var(--accent)" }}>{card.level}</span>}
      </div>

      <div style={{
        textAlign: "center", padding: "16px 14px", marginBottom: 14,
        background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)", borderRadius: 10,
      }}>
        <p style={{ fontSize: 9, color: "var(--accent)", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Deutsch</p>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, color: "var(--text)", lineHeight: 1.35 }}>{card.german}</p>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 10 }}>Englische Bedeutung?</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(["A", "B"] as const).map(opt => {
          const label = opt === "A" ? card.optionA : card.optionB;
          const isCorrect = feedback && card.correctOption === opt;
          const isWrong = feedback === "wrong" && card.correctOption !== opt;
          const idle = !feedback;
          return (
            <button
              key={opt}
              onClick={() => onChoose(opt)}
              disabled={disabled || !!feedback}
              style={{
                padding: "11px 8px", borderRadius: 8, cursor: disabled || feedback ? "default" : "pointer",
                fontSize: 12, lineHeight: 1.35, fontFamily: "var(--font-serif)",
                background: isCorrect
                  ? "rgba(39,174,96,0.12)"
                  : isWrong
                    ? "rgba(192,57,43,0.1)"
                    : "rgba(255,255,255,0.03)",
                border: isCorrect
                  ? "1px solid var(--green)"
                  : isWrong
                    ? "1px solid rgba(192,57,43,0.5)"
                    : "0.5px solid var(--border)",
                color: idle ? "var(--text-muted)" : "var(--text)",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {feedback === "correct" && (
        <p style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--green)" }}>Richtig!</p>
      )}
      {feedback === "wrong" && (
        <p style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--red)", lineHeight: 1.4 }}>
          Richtig: {card.correctOption === "A" ? card.optionA : card.optionB}
        </p>
      )}
    </div>
  );
}
