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
    <div style={{ width: "100%", maxWidth: 360 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        <span>{index + 1} / {total}</span>
        {card.level && <span>{card.level}</span>}
      </div>

      <div style={{
        textAlign: "center", padding: "28px 20px", marginBottom: 20,
        background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14,
      }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Deutsch</p>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, color: "var(--text)", lineHeight: 1.3 }}>{card.german}</p>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginBottom: 12 }}>Was bedeutet das auf Englisch?</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {(["A", "B"] as const).map(opt => {
          const label = opt === "A" ? card.optionA : card.optionB;
          const isCorrect = feedback && card.correctOption === opt;
          const isWrong = feedback === "wrong" && card.correctOption !== opt;
          return (
            <button
              key={opt}
              onClick={() => onChoose(opt)}
              disabled={disabled || !!feedback}
              style={{
                padding: "16px 12px", borderRadius: 12, cursor: disabled || feedback ? "default" : "pointer",
                fontSize: 14, lineHeight: 1.4, fontFamily: "var(--font-serif)",
                background: isCorrect ? "rgba(39,174,96,0.15)" : isWrong ? "rgba(192,57,43,0.12)" : "var(--surface)",
                border: isCorrect ? "1.5px solid var(--green)" : isWrong ? "1.5px solid var(--red)" : "0.5px solid var(--border)",
                color: "var(--text)",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {feedback === "correct" && (
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--green)" }}>Richtig!</p>
      )}
      {feedback === "wrong" && (
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--red)" }}>
          Nicht ganz — richtig: {card.correctOption === "A" ? card.optionA : card.optionB}
        </p>
      )}
    </div>
  );
}
