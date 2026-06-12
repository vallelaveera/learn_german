"use client";

import { useEffect, useCallback } from "react";
import { Volume2 } from "lucide-react";
import type { BinaryCard } from "@/lib/exercises/types";
import { DirectionToggle, type ExerciseDirection } from "@/components/DirectionToggle";
import { WordExamplesPanel } from "@/components/exercises/WordExamplesPanel";
import { VocabIcon } from "@/components/vocab/VocabIcon";
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
  const progress = ((index + (feedback ? 1 : 0)) / total) * 100;

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
    <div style={{ width: "100%", maxWidth: 320 }} className="animate-fade-in">
      {showDirectionToggle && onDirectionChange && (
        <div style={{ marginBottom: 16 }}>
          <DirectionToggle value={direction} onChange={onDirectionChange} />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span className="ui-label">Frage {index + 1} / {total}</span>
          {card.level && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", padding: "3px 8px", borderRadius: 8 }}>
              {card.level}
            </span>
          )}
        </div>
        <div className="ui-progress-track">
          <div className="ui-progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      </div>

      {showWordExamples && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <VocabIcon word={card.german} size={80} status="new" />
        </div>
      )}

      <div
        className="ui-card"
        style={{
          textAlign: "center",
          padding: "22px 18px",
          marginBottom: 16,
          background: "var(--gradient-soft)",
          border: "1px solid var(--accent-dim)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
          <span className="ui-label" style={{ color: "var(--accent)", margin: 0 }}>{promptLang}</span>
          <button
            type="button"
            onClick={playPrompt}
            aria-label="Nochmal anhören"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid var(--accent-dim)",
              background: "var(--surface)",
              color: "var(--accent)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Volume2 size={16} />
          </button>
        </div>
        <p className="ui-title-serif" style={{ fontSize: 22, margin: 0, lineHeight: 1.35 }}>
          {prompt}
        </p>
      </div>

      {showWordExamples && (
        <WordExamplesPanel word={card.german} disabled={!!feedback} />
      )}

      <p className="ui-muted" style={{ textAlign: "center", marginBottom: 12, fontSize: 12 }}>{chooseLabel}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                padding: "14px 10px",
                minHeight: 56,
                borderRadius: 14,
                cursor: disabled || feedback ? "default" : "pointer",
                fontSize: 13,
                lineHeight: 1.35,
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                background: isCorrect
                  ? "var(--brand-green-soft)"
                  : isWrong
                    ? "rgba(220,74,58,0.1)"
                    : "var(--surface)",
                border: isCorrect
                  ? "2px solid var(--green)"
                  : isWrong
                    ? "2px solid rgba(220,74,58,0.45)"
                    : "1px solid var(--border)",
                color: idle ? "var(--text)" : "var(--text)",
                boxShadow: idle ? "var(--shadow-sm)" : "none",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.15s",
                transform: idle ? "scale(1)" : isCorrect ? "scale(1.02)" : "scale(0.98)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {feedback === "correct" && (
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 14, fontWeight: 600, color: "var(--green)" }}>Richtig!</p>
      )}
      {feedback === "wrong" && (
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--red)", lineHeight: 1.45 }}>
          Richtig: {correctOption === "A" ? optionA : optionB}
        </p>
      )}
    </div>
  );
}
