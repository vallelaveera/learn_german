"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import {
  answersMatch,
  parseExerciseSpec,
  type ParsedExercise,
} from "@/lib/grammar/exercise-parser";

interface GrammarExerciseSessionProps {
  exercises: string[];
  levelColor: string;
  onComplete?: (correct: number, total: number) => void;
  onExerciseDone?: (index: number) => void;
  onSessionStart?: () => void;
}

type Phase = "active" | "feedback" | "done";

function renderPrompt(prompt: string): ReactNode {
  const parts = prompt.split("___");
  if (parts.length === 1) return prompt;
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <span
          style={{
            display: "inline-block",
            minWidth: 48,
            borderBottom: "2px solid currentColor",
            margin: "0 4px",
            verticalAlign: "baseline",
          }}
        />
      )}
    </span>
  ));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function GrammarExerciseSession({
  exercises,
  levelColor,
  onComplete,
  onExerciseDone,
  onSessionStart,
}: GrammarExerciseSessionProps) {
  const parsed = useMemo(
    () => exercises.map(parseExerciseSpec).filter(e => e.kind !== "unknown" || e.prompt),
    [exercises],
  );

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("active");
  const [correctCount, setCorrectCount] = useState(0);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [tokens, setTokens] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [flashRevealed, setFlashRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  useEffect(() => {
    onSessionStart?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  const current: ParsedExercise | undefined = parsed[index];
  const mcOptions = useMemo(() => {
    if (!current?.options?.length) return [];
    const opts = [...current.options];
    if (!opts.includes(current.answer)) opts.push(current.answer);
    return shuffle(opts);
  }, [current]);

  const resetExerciseState = useCallback((ex: ParsedExercise | undefined) => {
    setInput("");
    setSelected(null);
    setFlashRevealed(false);
    setBuilt([]);
    setTokens(ex?.tokens ? shuffle(ex.tokens) : []);
    setPhase("active");
    setWasCorrect(false);
  }, []);

  const advance = useCallback(
    (correct: boolean) => {
      const nextCorrect = correct ? correctCount + 1 : correctCount;
      if (correct) {
        setCorrectCount(nextCorrect);
        onExerciseDone?.(index);
      }

      if (index + 1 >= parsed.length) {
        setPhase("done");
        onComplete?.(nextCorrect, parsed.length);
        return;
      }
      const next = parsed[index + 1];
      setIndex(i => i + 1);
      resetExerciseState(next);
    },
    [correctCount, index, onComplete, onExerciseDone, parsed, resetExerciseState],
  );

  const checkAnswer = useCallback(() => {
    if (!current) return;
    let correct = false;

    if (current.kind === "flashcard") {
      setFlashRevealed(true);
      setPhase("feedback");
      setWasCorrect(true);
      return;
    }

    if (current.kind === "multiple-choice") {
      correct = selected !== null && answersMatch(selected, current.answer);
    } else if (current.kind === "sentence-build") {
      const builtSentence = built.join(" ");
      correct = answersMatch(builtSentence, current.answer);
    } else {
      const trimmed = input.trim();
      if (!trimmed && current.answer === "—") {
        correct = true;
      } else {
        correct = answersMatch(trimmed, current.answer);
      }
    }

    setWasCorrect(correct);
    setPhase("feedback");
  }, [built, current, input, selected]);

  const addToken = (token: string, poolIndex: number) => {
    setBuilt(prev => [...prev, token]);
    setTokens(prev => prev.filter((_, i) => i !== poolIndex));
  };

  const removeBuilt = (i: number) => {
    const token = built[i];
    if (!token) return;
    setBuilt(prev => prev.filter((_, j) => j !== i));
    setTokens(prev => [...prev, token]);
  };

  if (parsed.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 16 }}>
        Noch keine Übungen für diesen Bereich.
      </p>
    );
  }

  if (phase === "done") {
    const pct = Math.round((correctCount / parsed.length) * 100);
    return (
      <div className="ui-card" style={{ padding: 20, textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px", color: levelColor }}>
          Fertig!
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
          {correctCount} von {parsed.length} richtig ({pct}%)
        </p>
        <button
          type="button"
          className="ui-btn"
          onClick={() => {
            setIndex(0);
            setCorrectCount(0);
            resetExerciseState(parsed[0]);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RotateCcw size={14} />
          Nochmal
        </button>
      </div>
    );
  }

  if (!current) return null;

  const blankCount = (current.prompt.match(/___/g) ?? []).length;
  const multiBlankHint =
    blankCount > 1 || (current.answer.includes("/") && current.kind === "fill-blank")
      ? "Mehrere Lücken: Antwort mit Leerzeichen oder / trennen."
      : null;

  const progress = ((index + (phase === "feedback" ? 1 : 0)) / parsed.length) * 100;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            Übung {index + 1} / {parsed.length}
          </span>
          <span style={{ fontSize: 11, color: levelColor, fontWeight: 600 }}>
            {current.kind.replace("-", " ")}
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: "var(--border-light)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: levelColor,
              transition: "width 0.2s",
            }}
          />
        </div>
      </div>

      {current.contextFlag && (
        <p
          style={{
            fontSize: 11,
            color: "#9A3412",
            background: "#FFF7ED",
            border: "1px solid #FDBA74",
            borderRadius: 8,
            padding: "6px 10px",
            margin: "0 0 12px",
          }}
        >
          Satzkontext beachten — Verb bestimmt den Fall.
        </p>
      )}

      <div className="ui-card" style={{ padding: 16, marginBottom: 12 }}>
        {current.kind === "flashcard" ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>{current.prompt}</p>
            {flashRevealed && (
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>{current.answer}</p>
            )}
          </div>
        ) : current.kind === "multiple-choice" ? (
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 14px", lineHeight: 1.5 }}>
              {renderPrompt(current.prompt)}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mcOptions.map(opt => {
                const isSelected = selected === opt;
                const showResult = phase === "feedback";
                const isAnswer = answersMatch(opt, current.answer);
                let border = "1px solid var(--border-light)";
                let bg = "#fff";
                if (showResult && isAnswer) {
                  border = "2px solid #1D9E75";
                  bg = "#EAF3DE";
                } else if (showResult && isSelected && !isAnswer) {
                  border = "2px solid #DC2626";
                  bg = "#FEF2F2";
                } else if (isSelected) {
                  border = `2px solid ${levelColor}`;
                  bg = `${levelColor}11`;
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={phase === "feedback"}
                    onClick={() => setSelected(opt)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border,
                      background: bg,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: phase === "feedback" ? "default" : "pointer",
                    }}
                  >
                    {opt === "" || opt === "—" ? "(kein Artikel)" : opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : current.kind === "sentence-build" ? (
          <div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
              Baue den Satz:
            </p>
            <div
              style={{
                minHeight: 48,
                padding: 10,
                borderRadius: 10,
                border: "2px dashed var(--border-light)",
                marginBottom: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {built.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Tippe Wörter an…</span>
              )}
              {built.map((t, i) => (
                <button
                  key={`${t}-${i}`}
                  type="button"
                  disabled={phase === "feedback"}
                  onClick={() => removeBuilt(i)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${levelColor}`,
                    background: `${levelColor}15`,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tokens.map((t, i) => (
                <button
                  key={`pool-${t}-${i}`}
                  type="button"
                  disabled={phase === "feedback"}
                  onClick={() => addToken(t, i)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-light)",
                    background: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.5 }}>
              {renderPrompt(current.prompt)}
            </p>
            {multiBlankHint && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 8px" }}>{multiBlankHint}</p>
            )}
            <input
              type="text"
              value={input}
              disabled={phase === "feedback"}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && phase === "active") checkAnswer();
              }}
              placeholder="Antwort…"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--border-light)",
                fontSize: 15,
                boxSizing: "border-box",
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        )}

        {phase === "feedback" && current.kind !== "flashcard" && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 8,
              background: wasCorrect ? "#EAF3DE" : "#FEF2F2",
              border: `1px solid ${wasCorrect ? "#1D9E75" : "#DC2626"}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            {wasCorrect ? (
              <Check size={16} color="#1D9E75" style={{ flexShrink: 0, marginTop: 2 }} />
            ) : (
              <X size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px", color: wasCorrect ? "#1D9E75" : "#DC2626" }}>
                {wasCorrect ? "Richtig!" : "Nicht ganz."}
              </p>
              {!wasCorrect && (
                <p style={{ fontSize: 13, margin: 0, color: "var(--text-muted)" }}>
                  Richtig: <strong>{current.answer || "(kein Artikel)"}</strong>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {phase === "active" ? (
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={checkAnswer}
            disabled={
              current.kind === "multiple-choice"
                ? !selected
                : current.kind === "sentence-build"
                  ? built.length === 0
                  : current.kind === "flashcard"
                    ? false
                    : !input.trim() && current.answer !== "—"
            }
            style={{ flex: 1, background: levelColor, borderColor: levelColor }}
          >
            {current.kind === "flashcard" && !flashRevealed ? "Aufdecken" : "Prüfen"}
          </button>
        ) : (
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => advance(wasCorrect || current.kind === "flashcard")}
            style={{ flex: 1, background: levelColor, borderColor: levelColor, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            Weiter
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
