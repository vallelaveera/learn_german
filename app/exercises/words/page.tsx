"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BinaryFlashcard } from "@/components/BinaryFlashcard";
import type { BinaryCard } from "@/lib/exercises/types";

function WordsPracticeInner() {
  const router = useRouter();
  const [cards, setCards] = useState<BinaryCard[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/exercises/warmup")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => { if (data?.cards) setCards(data.cards); })
      .finally(() => setLoading(false));
  }, [router]);

  const saveResult = (result: { itemId: string; german: string; correct: boolean }) => {
    fetch("/api/exercises/warmup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: [result] }),
    });
  };

  const handleChoose = (option: "A" | "B") => {
    const card = cards[index];
    if (!card || feedback) return;
    const correct = card.correctOption === option;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? "correct" : "wrong");
    saveResult({ itemId: card.id, german: card.german, correct });
    const delay = correct ? 900 : 2000;
    setTimeout(() => {
      if (index + 1 >= cards.length) setDone(true);
      else {
        setIndex(i => i + 1);
        setFeedback(null);
      }
    }, delay);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Wörter werden geladen...</p>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", padding: 24, textAlign: "center" }}>
        <p style={{ marginTop: 80, color: "var(--text-muted)" }}>Keine Wörter verfügbar.</p>
        <Link href="/mode" style={{ color: "var(--accent)", marginTop: 16, display: "inline-block" }}>← Zurück</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{
        minHeight: "100dvh", background: "var(--bg)", padding: 24,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>📚</p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 300, marginBottom: 8 }}>
          {score} / {cards.length} richtig
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>Wörter üben</p>
        <Link href="/mode" style={{ padding: "14px 28px", borderRadius: 10, background: "#7F77DD", color: "#fff", fontSize: 14, fontFamily: "var(--font-mono)", textDecoration: "none" }}>
          Zurück
        </Link>
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
      <header style={{ width: "100%", maxWidth: 300, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 300, color: "var(--text)", marginBottom: 4 }}>Wörter üben</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>Deutsch oben — wähle die richtige Bedeutung.</p>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6, textDecoration: "none" }}>←</Link>
      </header>

      <BinaryFlashcard
        card={cards[index]}
        index={index}
        total={cards.length}
        feedback={feedback}
        onChoose={handleChoose}
        direction="de-en"
        showDirectionToggle={false}
      />
    </div>
  );
}

export default function WordsPracticePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Wörter werden geladen...</p>
      </div>
    }>
      <WordsPracticeInner />
    </Suspense>
  );
}
