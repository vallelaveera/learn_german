"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CASE_LABEL, GENDER_LABEL } from "@/lib/articles/declension";
import { shuffleQuestions } from "@/lib/articles/questions";
import type { QuizQuestion } from "@/lib/articles/types";

interface ArticleQuizPanelProps {
  questions: QuizQuestion[];
  accentColor: string;
  onAnswer: (correct: boolean) => void;
  onProgress?: (current: number, total: number) => void;
}

function questionPoolKey(questions: QuizQuestion[]): string {
  return questions.map(q => q.id).join("|");
}

function renderSentence(sentence: string) {
  const parts = sentence.split("___");
  if (parts.length < 2) return sentence;
  return (
    <>
      {parts[0]}
      <span
        style={{
          display: "inline-block",
          minWidth: 52,
          borderBottom: "2.5px solid #7F77DD",
          margin: "0 4px",
          textAlign: "center",
          fontWeight: 700,
          fontSize: 17,
          color: "#534AB7",
          padding: "0 4px",
        }}
      >
        ___
      </span>
      {parts.slice(1).join("___")}
    </>
  );
}

export function ArticleQuizPanel({ questions, accentColor, onAnswer, onProgress }: ArticleQuizPanelProps) {
  const poolKey = questionPoolKey(questions);
  const [order, setOrder] = useState<QuizQuestion[]>(() => shuffleQuestions(questions));
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [blankState, setBlankState] = useState<"idle" | "ok" | "no">("idle");
  const [chosen, setChosen] = useState<string | null>(null);
  const [optionStates, setOptionStates] = useState<Record<string, "idle" | "ok" | "no">>({});
  const [roundComplete, setRoundComplete] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);

  const question = order[index];

  useEffect(() => {
    setOrder(shuffleQuestions(questions));
    setIndex(0);
    setAnswered(false);
    setBlankState("idle");
    setChosen(null);
    setOptionStates({});
    setRoundComplete(false);
    setRoundCorrect(0);
  }, [poolKey]);

  useEffect(() => {
    if (roundComplete) {
      onProgress?.(order.length, order.length);
      return;
    }
    onProgress?.(index + (answered ? 1 : 0), order.length);
  }, [index, answered, order.length, roundComplete, onProgress]);

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

  const resetQuestionUi = useCallback(() => {
    setAnswered(false);
    setBlankState("idle");
    setChosen(null);
    setOptionStates({});
  }, []);

  const restartRound = useCallback(() => {
    setOrder(shuffleQuestions(questions));
    setIndex(0);
    setRoundComplete(false);
    setRoundCorrect(0);
    resetQuestionUi();
  }, [questions, resetQuestionUi]);

  const handleNext = () => {
    if (order.length === 0) return;
    if (index >= order.length - 1) {
      setRoundComplete(true);
      return;
    }
    setIndex(i => i + 1);
    resetQuestionUi();
  };

  const handleChoose = (option: string) => {
    if (!question || answered || roundComplete) return;
    const isCorrect = option.toLowerCase() === question.blank.toLowerCase();
    setAnswered(true);
    setChosen(option);
    setBlankState(isCorrect ? "ok" : "no");
    const states: Record<string, "idle" | "ok" | "no"> = {};
    shuffledOptions.forEach(opt => {
      if (opt.toLowerCase() === question.blank.toLowerCase()) states[opt] = "ok";
      else if (opt === option && !isCorrect) states[opt] = "no";
      else states[opt] = "idle";
    });
    if (isCorrect) states[option] = "ok";
    setOptionStates(states);
    if (isCorrect) setRoundCorrect(c => c + 1);
    onAnswer(isCorrect);
  };

  if (!question && !roundComplete) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
        Keine Fragen für dieses Thema.
      </p>
    );
  }

  if (roundComplete) {
    return (
      <div
        className="ui-card ui-card-padded"
        style={{ textAlign: "center", border: "1px solid var(--border-light)" }}
      >
        <p style={{ fontSize: 32, margin: "0 0 8px" }}>✓</p>
        <h2 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 8px" }}>
          Quiz geschafft!
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px" }}>
          {roundCorrect} / {order.length} richtig in dieser Runde
        </p>
        <button
          type="button"
          onClick={restartRound}
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
          Nochmal quizzen
        </button>
      </div>
    );
  }

  const caseLabel = `${question!.type === "def" ? "Bestimmt" : "Unbestimmt"} · ${CASE_LABEL[question!.case]} · ${GENDER_LABEL[question!.gender]}`;
  const explanationPrefix = blankState === "ok" ? "✓ Richtig! " : blankState === "no" ? "✗ Falsch. " : "";

  return (
    <div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 10px", fontWeight: 600 }}>
        Frage {index + 1} / {order.length}
      </p>

      <div
        className="ui-card ui-card-padded"
        style={{ marginBottom: 12, border: "1px solid var(--border-light)" }}
      >
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
          {caseLabel}
        </div>
        <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text)", marginBottom: 8, lineHeight: 1.5 }}>
          {answered ? (
            <>
              {question!.sentence.split("___")[0]}
              <span
                style={{
                  display: "inline-block",
                  minWidth: 52,
                  margin: "0 4px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 17,
                  padding: "0 6px",
                  borderRadius: 4,
                  borderBottom: `2.5px solid ${blankState === "ok" ? "#1D9E75" : "#E24B4A"}`,
                  color: blankState === "ok" ? "#1D9E75" : "#E24B4A",
                  background: blankState === "ok" ? "#EAF3DE" : "#FCEBEB",
                }}
              >
                {chosen}
              </span>
              {question!.sentence.split("___").slice(1).join("___")}
            </>
          ) : (
            renderSentence(question!.sentence)
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
          💡 {question!.hint}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {shuffledOptions.map(opt => {
            const state = optionStates[opt] ?? "idle";
            return (
              <button
                key={opt}
                type="button"
                disabled={answered}
                onClick={() => handleChoose(opt)}
                style={{
                  minHeight: 44,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${
                    state === "ok" ? "#1D9E75" : state === "no" ? "#E24B4A" : "var(--border-light)"
                  }`,
                  background:
                    state === "ok" ? "#EAF3DE" : state === "no" ? "#FCEBEB" : "#fff",
                  color:
                    state === "ok" ? "#1D9E75" : state === "no" ? "#E24B4A" : "var(--text)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: answered ? "default" : "pointer",
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
              fontSize: 11,
              padding: "10px 12px",
              borderRadius: 8,
              marginTop: 12,
              lineHeight: 1.5,
              background: blankState === "ok" ? "#EAF3DE" : "#FCEBEB",
              color: blankState === "ok" ? "#27500A" : "#501313",
            }}
          >
            {explanationPrefix}
            {question!.explanation}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleNext}
        disabled={!answered}
        style={{
          width: "100%",
          minHeight: 48,
          borderRadius: 12,
          background: answered ? accentColor : "var(--border-light)",
          color: answered ? "#fff" : "var(--text-muted)",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: answered ? "pointer" : "default",
        }}
      >
        {!answered
          ? "Erst antworten…"
          : index >= order.length - 1
            ? "Runde beenden →"
            : "Nächste Frage →"}
      </button>
    </div>
  );
}
