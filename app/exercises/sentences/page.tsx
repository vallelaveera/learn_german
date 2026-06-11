"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DirectionToggle, type ExerciseDirection } from "@/components/DirectionToggle";
import { speakExercisePrompt, stopExerciseSpeech } from "@/lib/exercise-speech";

interface Chip {
  id: string;
  word: string;
}

interface SentenceExercise {
  id: string;
  german: string;
  english: string;
  level: string;
  words: string[];
  chips: Chip[];
  said?: string;
}

type Phase = "preview" | "build" | "complete" | "done";

const PREVIEW_MS = 3000;

function SentencesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const fromCall = params.get("source") === "call";
  const sessionId = params.get("session");

  const [exercises, setExercises] = useState<SentenceExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("preview");
  const [built, setBuilt] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<ExerciseDirection>("en-de");
  const [showEnHint, setShowEnHint] = useState(false);

  const current = exercises[index];
  const promptText = current
    ? (direction === "en-de" ? current.english : current.german)
    : "";
  const promptSpeechLang = direction === "en-de" ? "en" : "de";

  const playPrompt = useCallback(() => {
    if (!promptText) return;
    speakExercisePrompt(promptText, promptSpeechLang).catch(() => {});
  }, [promptText, promptSpeechLang]);

  useEffect(() => {
    const url = fromCall
      ? `/api/exercises/sentences?source=call${sessionId ? `&session=${encodeURIComponent(sessionId)}` : ""}`
      : "/api/exercises/sentences";
    fetch(url)
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => { if (data?.exercises?.length) setExercises(data.exercises); })
      .finally(() => setLoading(false));
  }, [router, fromCall, sessionId]);

  useEffect(() => {
    if (phase !== "preview" || !current) return;
    playPrompt();
    const t = setTimeout(() => setPhase("build"), PREVIEW_MS);
    return () => {
      clearTimeout(t);
      stopExerciseSpeech();
    };
  }, [phase, current, index, direction, playPrompt]);

  useEffect(() => {
    setShowEnHint(false);
  }, [index, phase, direction]);

  const saveResult = (correct: boolean) => {
    if (!current) return;
    const body: {
      results: { itemId: string; german: string; correct: boolean }[];
      practicedCorrectionIds?: string[];
    } = {
      results: [{ itemId: current.id, german: current.german, correct }],
    };
    if (fromCall && correct) {
      body.practicedCorrectionIds = [current.id];
    }
    fetch("/api/exercises/sentences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const nextSentence = useCallback(() => {
    setBuilt([]);
    setWrongId(null);
    if (index + 1 >= exercises.length) {
      setPhase("done");
      return;
    }
    setIndex(i => i + 1);
    setPhase("preview");
  }, [index, exercises.length]);

  const handleChip = (chip: Chip) => {
    if (!current || wrongId) return;
    const expected = current.words[built.length];
    if (chip.word !== expected) {
      setWrongId(chip.id);
      setTimeout(() => setWrongId(null), 500);
      return;
    }
    const next = [...built, chip.word];
    setBuilt(next);
    if (next.length === current.words.length) {
      setScore(s => s + 1);
      saveResult(true);
      setPhase("complete");
      setTimeout(() => nextSentence(), 2000);
    }
  };

  const previewLabel = fromCall
    ? "KORREKTUR AUS DEINEM ANRUF"
    : direction === "en-de"
      ? "BAUE DIESEN SATZ"
      : "MERKE DIR DEN SATZ";

  const renderPromptCard = (compact?: boolean) => {
    if (!current) return null;
    return (
      <div style={{
        textAlign: "center",
        padding: compact ? "14px 16px" : "28px 20px",
        marginBottom: compact ? 16 : 24,
        background: "var(--accent-glow)",
        border: "0.5px solid var(--accent-dim)",
        borderRadius: 12,
      }}>
        {!compact && (
          <p style={{ fontSize: 10, color: "var(--accent)", marginBottom: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
            {previewLabel}
          </p>
        )}
        {fromCall && current.said && !compact && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontStyle: "italic" }}>
            Du sagtest: „{current.said}"
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: compact ? 0 : 4 }}>
          <p style={{
            fontFamily: "var(--font-serif)",
            fontSize: compact ? 17 : 20,
            color: "var(--text)",
            lineHeight: 1.45,
            margin: 0,
            fontStyle: direction === "en-de" ? "italic" : "normal",
          }}>
            {promptText}
          </p>
          <button
            type="button"
            onClick={playPrompt}
            style={{
              flexShrink: 0,
              fontSize: 10,
              padding: "4px 8px",
              borderRadius: 4,
              border: "0.5px solid var(--accent-dim)",
              background: "var(--surface)",
              color: "var(--accent)",
              cursor: "pointer",
            }}
            aria-label="Nochmal anhören"
          >
            🔊
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sätze werden geladen...</p>
      </div>
    );
  }

  if (!exercises.length) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", padding: 24, textAlign: "center" }}>
        <p style={{ marginTop: 80, color: "var(--text-muted)" }}>
          {fromCall
            ? "Keine übbaren Korrekturen aus diesem Anruf (Sätze zu kurz oder schon geübt)."
            : "Keine Sätze verfügbar."}
        </p>
        <Link href="/mode" style={{ color: "var(--accent)", marginTop: 16, display: "inline-block" }}>← Zurück</Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={{
        minHeight: "100dvh", background: "var(--bg)", padding: 24,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🧩</p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 300, marginBottom: 8 }}>
          {score} / {exercises.length} richtig
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>
          {fromCall ? "Satzbau — aus deinem Anruf" : "Satzbau — Wörter in der richtigen Reihenfolge"}
        </p>
        <Link href="/mode" style={{ padding: "14px 28px", borderRadius: 10, background: "var(--accent)", color: "var(--bg)", fontSize: 14, fontFamily: "var(--font-mono)", textDecoration: "none" }}>
          Zurück
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)",
      paddingLeft: 20, paddingRight: 20,
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300 }}>
            {fromCall ? "Satzbau · Anruf" : "Satzbau"}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{index + 1} / {exercises.length} · {current?.level}</p>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      <div style={{ maxWidth: 400, margin: "0 auto 16px" }}>
        <DirectionToggle value={direction} onChange={setDirection} />
      </div>

      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        {phase === "preview" && renderPromptCard()}

        {phase === "complete" && current && (
          <div style={{
            textAlign: "center", padding: "28px 20px", marginBottom: 24,
            background: "rgba(39,174,96,0.08)", border: "0.5px solid rgba(39,174,96,0.35)", borderRadius: 12,
          }}>
            <p style={{ fontSize: 10, color: "var(--green)", marginBottom: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>RICHTIG!</p>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", lineHeight: 1.45, marginBottom: 10 }}>{current.german}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{current.english}</p>
          </div>
        )}

        {phase === "build" && current && (
          <>
            {renderPromptCard(true)}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, flex: 1 }}>
                Tippe die Wörter in der richtigen Reihenfolge
              </p>
              {direction === "de-en" && (
                <button
                  type="button"
                  onClick={() => setShowEnHint(true)}
                  disabled={showEnHint}
                  style={{
                    flexShrink: 0,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: `0.5px solid ${showEnHint ? "var(--accent-dim)" : "var(--border)"}`,
                    background: showEnHint ? "var(--accent-glow)" : "var(--surface)",
                    color: showEnHint ? "var(--accent)" : "var(--text-muted)",
                    cursor: showEnHint ? "default" : "pointer",
                  }}
                >
                  {showEnHint ? "EN ✓" : "EN"}
                </button>
              )}
            </div>
            {direction === "de-en" && showEnHint && (
              <p style={{
                fontSize: 13, color: "var(--text-muted)", fontStyle: "italic",
                textAlign: "center", lineHeight: 1.5, margin: "0 0 12px",
              }}>
                {current.english}
              </p>
            )}

            <div style={{
              minHeight: 52, padding: "10px 12px", marginBottom: 16, borderRadius: 10,
              border: "0.5px solid var(--border)", background: "var(--surface)",
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
            }}>
              {built.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>Dein Satz...</span>
              )}
              {built.map((w, i) => (
                <span key={`${w}-${i}`} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 14,
                  background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)",
                  color: "var(--text)", fontFamily: "var(--font-serif)",
                }}>{w}</span>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {current.chips.map(chip => {
                const usedForWord = built.filter(w => w === chip.word).length;
                const totalInSentence = current.words.filter(w => w === chip.word).length;
                const isUsed = usedForWord >= totalInSentence;
                const isWrong = wrongId === chip.id;
                if (isUsed) return null;
                return (
                  <button
                    key={chip.id}
                    onClick={() => handleChip(chip)}
                    style={{
                      padding: "10px 14px", borderRadius: 8, fontSize: 14,
                      fontFamily: "var(--font-serif)", cursor: "pointer",
                      background: isWrong ? "rgba(192,57,43,0.15)" : "rgba(255,255,255,0.04)",
                      border: isWrong ? "1px solid var(--red)" : "0.5px solid var(--border)",
                      color: isWrong ? "var(--red)" : "var(--text-muted)",
                      transition: "all 0.15s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {chip.word}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SentencesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sätze werden geladen...</p>
      </div>
    }>
      <SentencesInner />
    </Suspense>
  );
}
