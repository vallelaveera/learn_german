"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
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
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Target size={36} />
        </div>
        <h1 className="ui-title-serif" style={{ fontSize: 28, marginBottom: 8 }}>Level: {finished.level}</h1>
        <p className="ui-muted" style={{ marginBottom: 28, maxWidth: 300 }}>
          Maya passt ihre Sprache an dein Niveau an.
          {betaShort && " Du kannst dein Level jederzeit oben auf dem Home-Bildschirm ändern."}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/mode?level=${finished.level}`)}
          className="ui-btn-primary"
          style={{ width: "auto", minWidth: 200, fontSize: 14 }}
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
        <p className="ui-title-serif" style={{ fontSize: 22, marginBottom: 6 }}>
          {betaShort ? "Kurzer Level-Check" : "Dein Deutsch-Level"}
        </p>
        <p className="ui-muted">
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
        type="button"
        onClick={skipAll}
        className="ui-btn-ghost"
        style={{ marginTop: 32 }}
      >
        {betaShort ? "Später — ich starte mit A1" : "Überspringen (A1 annehmen)"}
      </button>
    </div>
  );
}
