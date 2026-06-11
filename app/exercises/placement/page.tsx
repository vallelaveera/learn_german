"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BinaryFlashcard } from "@/components/BinaryFlashcard";
import type { BinaryCard, PlacementLevel } from "@/lib/exercises/types";
import { normalizeGermanLevel } from "@/lib/levels";

export default function PlacementPage() {
  const router = useRouter();
  const [cards, setCards] = useState<BinaryCard[]>([]);
  const [level, setLevel] = useState<PlacementLevel>("A1");
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [roundResults, setRoundResults] = useState<{ itemId: string; german: string; correct: boolean }[]>([]);
  const [completedLevels, setCompletedLevels] = useState<PlacementLevel[]>([]);
  const [accuracies, setAccuracies] = useState<Partial<Record<PlacementLevel, number>>>({});
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState<{ level: string; score: number } | null>(null);
  const [betaShort, setBetaShort] = useState(false);

  const loadRound = (lvl: PlacementLevel) => {
    setLoading(true);
    fetch(`/api/exercises/placement?level=${lvl}`)
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (data?.done) {
          const lvl = normalizeGermanLevel(data.currentLevel);
          router.push(`/mode?level=${lvl}`);
          return;
        }
        if (data?.round) {
          setBetaShort(data.betaShort === true);
          setLevel(data.round.level);
          setCards(data.round.cards);
          setIndex(0);
          setRoundResults([]);
          setFeedback(null);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRound("A1"); }, []);

  const submitRound = async (results: typeof roundResults) => {
    const res = await fetch("/api/exercises/placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, results, completedLevels, accuracies }),
    });
    const data = await res.json();
    if (data.done) {
      const lvl = normalizeGermanLevel(data.level);
      setFinished({ level: lvl, score: data.score });
      return;
    }
    if (data.nextRound) {
      setCompletedLevels(data.completedLevels ?? [...completedLevels, level]);
      setAccuracies(data.accuracies ?? accuracies);
      setLevel(data.nextRound.level);
      setCards(data.nextRound.cards);
      setIndex(0);
      setRoundResults([]);
      setFeedback(null);
    }
  };

  const handleChoose = (option: "A" | "B") => {
    const card = cards[index];
    if (!card || feedback) return;
    const correct = card.correctOption === option;
    setFeedback(correct ? "correct" : "wrong");
    const updated = [...roundResults, { itemId: card.id, german: card.german, correct }];
    setRoundResults(updated);
    setTimeout(() => {
      if (index + 1 >= cards.length) submitRound(updated);
      else { setIndex(i => i + 1); setFeedback(null); }
    }, 900);
  };

  const skipAll = async () => {
    await fetch("/api/exercises/placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, results: [], skip: true }),
    });
    router.push("/mode");
  };

  if (finished) {
    return (
      <div style={{
        minHeight: "100dvh", background: "var(--bg)", padding: 24,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>🎯</p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 300, marginBottom: 8 }}>Level: {finished.level}</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>
          Maya passt ihre Sprache an dein Niveau an.
          {betaShort && " Du kannst dein Level jederzeit oben auf dem Home-Bildschirm ändern."}
        </p>
        <button
          onClick={() => router.push(`/mode?level=${finished.level}`)}
          style={{ padding: "14px 28px", borderRadius: 10, background: "var(--accent)", color: "var(--bg)", border: "none", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)" }}
        >
          Weiter →
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Level-Check wird vorbereitet...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      paddingTop: "calc(env(safe-area-inset-top,0px) + 20px)",
      paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)",
      paddingLeft: 20, paddingRight: 20,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <header style={{ width: "100%", maxWidth: 360, marginBottom: 28 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 300, color: "var(--text)", marginBottom: 6 }}>
          {betaShort ? "Kurzer Level-Check" : "Dein Deutsch-Level"}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          {betaShort
            ? `${cards.length} kurze Fragen — wähle die richtige englische Bedeutung.`
            : `Kurzer Check — wähle die richtige englische Bedeutung. Stufe ${level}.`}
        </p>
      </header>

      {cards[index] && (
        <BinaryFlashcard
          card={cards[index]}
          index={index}
          total={cards.length}
          feedback={feedback}
          onChoose={handleChoose}
          direction="de-en"
          showDirectionToggle={false}
        />
      )}

      <button
        onClick={skipAll}
        style={{
          marginTop: 32, fontSize: 12, color: "var(--text-muted)",
          background: "none", border: "0.5px solid var(--border)",
          padding: "10px 20px", borderRadius: 8, cursor: "pointer",
          fontFamily: "var(--font-mono)",
        }}
      >
        {betaShort ? "Später — ich starte mit A1" : "Überspringen (A1 annehmen)"}
      </button>
    </div>
  );
}
