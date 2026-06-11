"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
}

type Phase = "preview" | "build" | "done";

export default function SentencesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<SentenceExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("preview");
  const [built, setBuilt] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const current = exercises[index];

  useEffect(() => {
    fetch("/api/exercises/sentences")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => { if (data?.exercises?.length) setExercises(data.exercises); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (phase !== "preview" || !current) return;
    const t = setTimeout(() => setPhase("build"), 2800);
    return () => clearTimeout(t);
  }, [phase, current, index]);

  const saveResult = (correct: boolean) => {
    if (!current) return;
    fetch("/api/exercises/sentences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        results: [{ itemId: current.id, german: current.german, correct }],
      }),
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
      setTimeout(() => nextSentence(), 700);
    }
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
        <p style={{ marginTop: 80, color: "var(--text-muted)" }}>Keine Sätze verfügbar.</p>
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
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>Satzbau — Wörter in der richtigen Reihenfolge</p>
        <Link href="/mode" style={{ padding: "14px 28px", borderRadius: 10, background: "var(--accent)", color: "var(--bg)", fontSize: 14, fontFamily: "var(--font-mono)", textDecoration: "none" }}>
          Zurück
        </Link>
      </div>
    );
  }

  const usedCounts: Record<string, number> = {};
  built.forEach(w => { usedCounts[w] = (usedCounts[w] ?? 0) + 1; });

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)",
      paddingLeft: 20, paddingRight: 20,
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300 }}>Satzbau</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{index + 1} / {exercises.length} · {current?.level}</p>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        {phase === "preview" && current && (
          <div style={{
            textAlign: "center", padding: "28px 20px", marginBottom: 24,
            background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)", borderRadius: 12,
          }}>
            <p style={{ fontSize: 10, color: "var(--accent)", marginBottom: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>MERKE DIR DEN SATZ</p>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", lineHeight: 1.45, marginBottom: 10 }}>{current.german}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{current.english}</p>
          </div>
        )}

        {phase === "build" && current && (
          <>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 12 }}>Tippe die Wörter in der richtigen Reihenfolge</p>

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
