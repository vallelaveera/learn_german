"use client";

import { useEffect, useCallback } from "react";
import type { BinaryCard } from "@/lib/exercises/types";
import { DirectionToggle, type ExerciseDirection } from "@/components/DirectionToggle";
import { WordExamplesPanel } from "@/components/exercises/WordExamplesPanel";
import { speakExercisePrompt, stopExerciseSpeech } from "@/lib/exercise-speech";

interface Props {
  card: BinaryCard;
  index: number;
  total: number;
  feedback: "correct" | "wrong" | null;
  onChoose: (option: "A" | "B") => void;
  disabled?: boolean;
  direction?: ExerciseDirection;
  onDirectionChange?: (direction: ExerciseDirection) => void;
  showDirectionToggle?: boolean;
  speakOnShow?: boolean;
  showWordExamples?: boolean;
}

export function BinaryFlashcard({
  card,
  index,
  total,
  feedback,
  onChoose,
  disabled,
  direction = "en-de",
  onDirectionChange,
  showDirectionToggle = true,
  speakOnShow = true,
  showWordExamples = false,
}: Props) {
  const isEnDe = direction === "en-de";
  const prompt = isEnDe ? card.english : card.german;
  const promptLang = isEnDe ? "English" : "Deutsch";
  const promptSpeechLang = isEnDe ? "en" : "de";
  const optionA = isEnDe ? card.deOptionA : card.optionA;
  const optionB = isEnDe ? card.deOptionB : card.optionB;
  const correctOption = isEnDe ? card.deCorrectOption : card.correctOption;
  const chooseLabel = isEnDe ? "Welches Deutsch?" : "Englische Bedeutung?";

  const playPrompt = useCallback(() => {
    speakExercisePrompt(prompt, promptSpeechLang).catch(() => {});
  }, [prompt, promptSpeechLang]);

  useEffect(() => {
    if (!speakOnShow || feedback) return;
    playPrompt();
    return () => stopExerciseSpeech();
  }, [card.id, index, direction, speakOnShow, feedback, playPrompt]);

  const handleChoose = (option: "A" | "B") => {
    stopExerciseSpeech();
    onChoose(option);
  };

  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      {showDirectionToggle && onDirectionChange && (
        <div style={{ marginBottom: 14 }}>
          <DirectionToggle value={direction} onChange={onDirectionChange} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        <span>{index + 1} / {total}</span>
        {card.level && <span style={{ color: "var(--accent)" }}>{card.level}</span>}
      </div>

      <div style={{
        textAlign: "center", padding: "16px 14px", marginBottom: 14,
        background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)", borderRadius: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <p style={{ fontSize: 9, color: "var(--accent)", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            {promptLang}
          </p>
          <button
            type="button"
            onClick={playPrompt}
            style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4,
              border: "0.5px solid var(--accent-dim)", background: "var(--surface)",
              color: "var(--accent)", cursor: "pointer",
            }}
            aria-label="Nochmal anhören"
          >
            🔊
          </button>
        </div>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, color: "var(--text)", lineHeight: 1.35, margin: 0 }}>
          {prompt}
        </p>
      </div>

      {showWordExamples && (
        <WordExamplesPanel word={card.german} disabled={!!feedback} />
      )}

      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 10 }}>{chooseLabel}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(["A", "B"] as const).map(opt => {
          const label = opt === "A" ? optionA : optionB;
          const isCorrect = feedback && correctOption === opt;
          const isWrong = feedback === "wrong" && correctOption !== opt;
          const idle = !feedback;
          return (
            <button
              key={opt}
              onClick={() => handleChoose(opt)}
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
          Richtig: {correctOption === "A" ? optionA : optionB}
        </p>
      )}
    </div>
  );
}
