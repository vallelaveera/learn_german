"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, GripHorizontal, RotateCcw, X } from "lucide-react";
import { SuccessIllustration } from "@/components/illustrations/SuccessIllustration";
import {
  answersMatch,
  parseExerciseSpec,
  type ExerciseKind,
  type ParsedExercise,
} from "@/lib/grammar/exercise-parser";
import { getExerciseMeta } from "@/lib/grammar/exercise-meta";
import { warmVerifiedExamplesMetaRegistry } from "@/lib/grammar/verified-examples";
import { SessionReportActions } from "@/components/exercises/SessionReportActions";
import { useSessionReportLog } from "@/hooks/useSessionReportLog";
import type { SessionReportMeta } from "@/lib/exercises/session-report-types";

interface GrammarExerciseSessionProps {
  exercises: string[];
  levelColor: string;
  levelLightColor?: string;
  sessionReport?: SessionReportMeta;
  onComplete?: (correct: number, total: number) => void;
  onExerciseDone?: (index: number) => void;
  onSessionStart?: () => void;
}

type Phase = "active" | "feedback" | "done";

const KIND_LABELS: Record<ExerciseKind, string> = {
  flashcard: "Karteikarte",
  "fill-blank": "Lückentext",
  "drag-sort": "Sortieren",
  "sentence-build": "Satz bauen",
  "multiple-choice": "Auswahl",
  unknown: "Übung",
};

function renderPrompt(prompt: string, accentColor: string): ReactNode {
  const parts = prompt.split("___");
  if (parts.length === 1) return prompt;
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <span
          style={{
            display: "inline-block",
            minWidth: 56,
            minHeight: 22,
            borderBottom: `2px solid ${accentColor}`,
            margin: "0 4px",
            verticalAlign: "baseline",
            background: `${accentColor}18`,
            borderRadius: "4px 4px 0 0",
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
  levelLightColor = "#f5f5f5",
  sessionReport,
  onComplete,
  onExerciseDone,
  onSessionStart,
}: GrammarExerciseSessionProps) {
  const parsed = useMemo(() => {
    warmVerifiedExamplesMetaRegistry();
    return exercises
      .map(raw => {
        const ex = parseExerciseSpec(raw);
        const meta = getExerciseMeta(raw);
        if (!meta) return ex;
        return {
          ...ex,
          explanation: meta.explanation ?? ex.explanation,
          contextSentence: meta.contextSentence ?? ex.contextSentence,
          contextNote: meta.contextNote ?? ex.contextNote,
        };
      })
      .filter(e => e.kind !== "unknown" || e.prompt);
  }, [exercises]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("active");
  const [correctCount, setCorrectCount] = useState(0);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [tokens, setTokens] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [flashRevealed, setFlashRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const { items: reportItems, logItem, resetLog, getStartedAt } = useSessionReportLog();

  useEffect(() => {
    resetLog();
  }, [exercises, resetLog]);

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
    setInputFocused(false);
  }, []);

  useEffect(() => {
    resetExerciseState(parsed[index]);
  }, [index, parsed, resetExerciseState]);

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

  const recordAnswer = useCallback(
    (ex: ParsedExercise, correct: boolean, userAnswer?: string) => {
      if (!sessionReport) return;
      logItem({
        prompt: ex.prompt,
        userAnswer,
        correctAnswer: ex.answer || "(kein Artikel)",
        correct,
        explanation: ex.explanation,
      });
    },
    [logItem, sessionReport],
  );

  const checkAnswer = useCallback(() => {
    if (!current) return;
    let correct = false;
    let userAnswer: string | undefined;

    if (current.kind === "flashcard") {
      setFlashRevealed(true);
      setPhase("feedback");
      setWasCorrect(true);
      return;
    }

    if (current.kind === "multiple-choice") {
      userAnswer = selected ?? undefined;
      correct = selected !== null && answersMatch(selected, current.answer);
    } else if (current.kind === "sentence-build") {
      userAnswer = built.join(" ");
      correct = answersMatch(userAnswer, current.answer);
    } else {
      const trimmed = input.trim();
      userAnswer = trimmed || undefined;
      if (!trimmed && current.answer === "—") {
        correct = true;
      } else {
        correct = answersMatch(trimmed, current.answer);
      }
    }

    recordAnswer(current, correct, userAnswer);
    setWasCorrect(correct);
    setPhase("feedback");
  }, [built, current, input, recordAnswer, selected]);

  const addToken = (token: string, poolIndex: number) => {
    if (phase !== "active") return;
    setBuilt(prev => [...prev, token]);
    setTokens(prev => prev.filter((_, i) => i !== poolIndex));
  };

  const removeBuilt = (i: number) => {
    if (phase !== "active") return;
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
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <SuccessIllustration width={120} height={120} />
        <p style={{ fontSize: 17, fontWeight: 700, margin: "12px 0 6px", color: levelColor }}>
          Geschafft!
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
          {correctCount} von {parsed.length} richtig ({pct}%)
        </p>
        {sessionReport && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <SessionReportActions
              meta={sessionReport}
              score={correctCount}
              total={parsed.length}
              items={reportItems}
              startedAt={getStartedAt()}
            />
          </div>
        )}
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={() => {
            setIndex(0);
            setCorrectCount(0);
            resetLog();
            setPhase("active");
            resetExerciseState(parsed[0]);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: levelColor,
            borderColor: levelColor,
          }}
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
  const kindLabel = KIND_LABELS[current.kind] ?? "Übung";
  const sentenceReady = current.kind !== "sentence-build" || (built.length > 0 && tokens.length === 0);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
            {index + 1} / {parsed.length}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: levelColor,
              padding: "4px 10px",
              borderRadius: 999,
              background: levelLightColor,
            }}
          >
            {kindLabel}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "var(--border-light)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: levelColor,
              transition: "width 0.25s ease",
            }}
          />
        </div>
      </div>

      {current.contextFlag && (
        <div
          style={{
            fontSize: 12,
            color: "#9A3412",
            background: "#FFF7ED",
            border: "1px solid #FDBA74",
            borderRadius: 10,
            padding: "8px 12px",
            margin: "0 0 12px",
            lineHeight: 1.45,
          }}
        >
          {current.contextSentence && (
            <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#7C2D12" }}>
              {current.contextSentence}
            </p>
          )}
          <p style={{ margin: 0 }}>
            {current.contextNote ??
              "Satzkontext beachten — das Verb bestimmt den Fall."}
          </p>
        </div>
      )}

      {current.kind === "flashcard" ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 16px",
            borderRadius: 14,
            background: levelLightColor,
            border: `1px solid ${levelColor}33`,
            marginBottom: 14,
          }}
        >
          <p className="ui-title-serif" style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.35 }}>
            {current.prompt}
          </p>
          {flashRevealed && (
            <p style={{ fontSize: 15, color: "var(--text-muted)", margin: 0 }}>{current.answer}</p>
          )}
        </div>
      ) : current.kind === "multiple-choice" ? (
        <div style={{ marginBottom: 14 }}>
          <p
            className="ui-title-serif"
            style={{ fontSize: 18, fontWeight: 600, margin: "0 0 14px", lineHeight: 1.5 }}
          >
            {renderPrompt(current.prompt, levelColor)}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mcOptions.map((opt, optIdx) => {
              const isSelected = selected === opt;
              const showResult = phase === "feedback";
              const isAnswer = answersMatch(opt, current.answer);
              let border = "1px solid var(--border-light)";
              let bg = "var(--surface)";
              if (showResult && isAnswer) {
                border = "2px solid #1D9E75";
                bg = "#EAF3DE";
              } else if (showResult && isSelected && !isAnswer) {
                border = "2px solid #DC2626";
                bg = "#FEF2F2";
              } else if (isSelected) {
                border = `2px solid ${levelColor}`;
                bg = levelLightColor;
              }
              const letter = String.fromCharCode(65 + optIdx);
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={phase === "feedback"}
                  onClick={() => setSelected(opt)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border,
                    background: bg,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: phase === "feedback" ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 48,
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: isSelected ? levelColor : "var(--bg-warm)",
                      color: isSelected ? "#fff" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {letter}
                  </span>
                  <span>{opt === "" || opt === "—" ? "(kein Artikel)" : opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : current.kind === "sentence-build" ? (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
            Setze die Wörter in die richtige Reihenfolge.
          </p>
          <p style={{ fontSize: 11, color: levelColor, margin: "0 0 12px", fontWeight: 600 }}>
            Tipp: Bei Partizipialattributen steht das Nomen am Ende.
          </p>
          <div
            style={{
              minHeight: 72,
              padding: 12,
              borderRadius: 14,
              border: `2px ${built.length ? "solid" : "dashed"} ${levelColor}${built.length ? "" : "66"}`,
              background: levelLightColor,
              marginBottom: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            {built.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>
                <GripHorizontal size={16} />
                Wörter hier antippen…
              </span>
            ) : (
              built.map((t, i) => (
                <button
                  key={`${t}-${i}`}
                  type="button"
                  disabled={phase === "feedback"}
                  onClick={() => removeBuilt(i)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${levelColor}`,
                    background: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    boxShadow: "var(--shadow-sm)",
                    cursor: phase === "feedback" ? "default" : "pointer",
                  }}
                >
                  {t}
                </button>
              ))
            )}
          </div>
          {built.length > 0 && (
            <p
              className="ui-title-serif"
              style={{
                fontSize: 15,
                margin: "0 0 12px",
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--surface)",
                border: "1px solid var(--border-light)",
                lineHeight: 1.5,
              }}
            >
              {built.join(" ")}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tokens.map((t, i) => (
              <button
                key={`pool-${t}-${i}`}
                type="button"
                disabled={phase === "feedback"}
                onClick={() => addToken(t, i)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--border-light)",
                  background: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  minHeight: 44,
                  boxShadow: "var(--shadow-sm)",
                  cursor: phase === "feedback" ? "default" : "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <p
            className="ui-title-serif"
            style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.55 }}
          >
            {renderPrompt(current.prompt, levelColor)}
          </p>
          {multiBlankHint && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>{multiBlankHint}</p>
          )}
          <input
            type="text"
            value={input}
            disabled={phase === "feedback"}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={e => {
              if (e.key === "Enter" && phase === "active") checkAnswer();
            }}
            placeholder="Deine Antwort…"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: `2px solid ${inputFocused ? levelColor : "var(--border-light)"}`,
              fontSize: 16,
              boxSizing: "border-box",
              background: "#fff",
              outline: "none",
              fontFamily: "var(--font-serif, Georgia, serif)",
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
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 12,
            background: wasCorrect ? "#EAF3DE" : "#FEF2F2",
            border: `1px solid ${wasCorrect ? "#1D9E75" : "#DC2626"}`,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {wasCorrect ? (
            <Check size={18} color="#1D9E75" style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <X size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                margin: "0 0 4px",
                color: wasCorrect ? "#1D9E75" : "#DC2626",
              }}
            >
              {wasCorrect ? "Richtig!" : "Nicht ganz."}
            </p>
            {!wasCorrect && (
              <p style={{ fontSize: 13, margin: 0, color: "var(--text-muted)", lineHeight: 1.45 }}>
                Richtig:{" "}
                <strong style={{ color: "var(--text)" }}>
                  {current.answer || "(kein Artikel)"}
                </strong>
              </p>
            )}
            {current.explanation && (
              <p
                style={{
                  fontSize: 12,
                  margin: wasCorrect ? "4px 0 0" : "8px 0 0",
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                }}
              >
                {current.explanation}
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "feedback" && current.kind === "flashcard" && flashRevealed && current.explanation && (
        <p
          style={{
            fontSize: 12,
            margin: "0 0 14px",
            color: "var(--text-muted)",
            lineHeight: 1.45,
            padding: "0 4px",
          }}
        >
          {current.explanation}
        </p>
      )}

      {phase === "active" ? (
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={checkAnswer}
          disabled={
            current.kind === "multiple-choice"
              ? !selected
              : current.kind === "sentence-build"
                ? !sentenceReady
                : current.kind === "flashcard"
                  ? false
                  : !input.trim() && current.answer !== "—"
          }
          style={{
            width: "100%",
            minHeight: 48,
            background: levelColor,
            borderColor: levelColor,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {current.kind === "flashcard" && !flashRevealed ? "Aufdecken" : "Prüfen"}
        </button>
      ) : (
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={() => {
            if (current.kind === "flashcard" && flashRevealed) {
              recordAnswer(current, true, current.answer);
            }
            advance(wasCorrect || current.kind === "flashcard");
          }}
          style={{
            width: "100%",
            minHeight: 48,
            background: levelColor,
            borderColor: levelColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Weiter
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
