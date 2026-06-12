"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { shuffleQuestions } from "@/lib/articles/questions";
import type { PracticeQuestion } from "@/lib/articles/types";

interface ArticlePracticePanelProps {
  questions: PracticeQuestion[];
  accentColor: string;
  accentSoft: string;
  onAnswer: (correct: boolean) => void;
}

function splitSentence(sentence: string): [string, string] {
  const idx = sentence.indexOf("___");
  if (idx === -1) return [sentence, ""];
  return [sentence.slice(0, idx), sentence.slice(idx + 3)];
}

export function ArticlePracticePanel({
  questions,
  accentColor,
  accentSoft,
  onAnswer,
}: ArticlePracticePanelProps) {
  const [order, setOrder] = useState<PracticeQuestion[]>(() => shuffleQuestions(questions));
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [filled, setFilled] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [usedOption, setUsedOption] = useState<string | null>(null);

  const question = order[index];

  useEffect(() => {
    setOrder(shuffleQuestions(questions));
    setIndex(0);
    setAnswered(false);
    setFilled(null);
    setCorrect(null);
    setUsedOption(null);
  }, [questions]);

  const shuffledOptions = useMemo(() => {
    if (!question) return [];
    const opts = question.options.slice();
    for (let i = opts.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = opts[i];
      opts[i] = opts[j];
      opts[j] = tmp;
    }
    return opts;
  }, [question]);

  const reset = useCallback(() => {
    setAnswered(false);
    setFilled(null);
    setCorrect(null);
    setUsedOption(null);
  }, []);

  const handleNext = () => {
    if (order.length === 0) return;
    const next = (index + 1) % order.length;
    if (next === 0) setOrder(shuffleQuestions(questions));
    setIndex(next);
    reset();
  };

  const handleChoose = (option: string) => {
    if (!question || answered) return;
    const isCorrect = option.toLowerCase() === question.answer.toLowerCase();
    setAnswered(true);
    setFilled(option);
    setCorrect(isCorrect);
    setUsedOption(option);
    onAnswer(isCorrect);
  };

  if (!question) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
        Keine Übungen für dieses Thema.
      </p>
    );
  }

  const [before, after] = splitSentence(question.sentence);

  return (
    <div>
      <div
        style={{
          background: accentSoft,
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
          border: "1px solid var(--border-light)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", lineHeight: 1.7, marginBottom: 8 }}>
          {before}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 60,
              height: 36,
              border: `2px ${answered ? "solid" : "dashed"} ${
                !answered ? "#AFA9EC" : correct ? "#1D9E75" : "#E24B4A"
              }`,
              borderRadius: 8,
              margin: "0 4px",
              verticalAlign: "middle",
              fontSize: 13,
              fontWeight: 700,
              color: !answered ? accentColor : correct ? "#1D9E75" : "#E24B4A",
              background: !answered ? "#fff" : correct ? "#EAF3DE" : "#FCEBEB",
              padding: "0 8px",
            }}
          >
            {filled ?? "?"}
          </span>
          {after}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>💡 {question.hint}</div>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 8px" }}>
        Tippe den richtigen Artikel:
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {shuffledOptions.map(opt => {
          const used = usedOption === opt;
          const showCorrectOutline =
            answered && !correct && opt.toLowerCase() === question.answer.toLowerCase();
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => handleChoose(opt)}
              style={{
                minHeight: 44,
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: answered ? "default" : "pointer",
                border: showCorrectOutline ? "3px solid #1D9E75" : "1.5px solid transparent",
                background: used && answered
                  ? correct
                    ? "#1D9E75"
                    : "#E24B4A"
                  : accentColor,
                color: "#fff",
                opacity: answered && !used && !showCorrectOutline ? 0.35 : 1,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          style={{
            fontSize: 12,
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 12,
            background: correct ? "#EAF3DE" : "#FCEBEB",
            color: correct ? "#27500A" : "#501313",
          }}
        >
          {(correct ? "✓ Richtig! " : "✗ Falsch. ") + question.explanation}
        </div>
      )}

      {answered && (
        <button
          type="button"
          onClick={handleNext}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 12,
            background: accentColor,
            color: "#fff",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Nächster Satz →
        </button>
      )}
    </div>
  );
}
