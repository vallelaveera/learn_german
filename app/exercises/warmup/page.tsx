"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BinaryFlashcard } from "@/components/BinaryFlashcard";
import type { BinaryCard } from "@/lib/exercises/types";

function WarmupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/mode";

  const [cards, setCards] = useState<BinaryCard[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(true);
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

  const finish = async () => {
    setDone(true);
    router.push(next);
  };

  const handleChoose = (option: "A" | "B") => {
    const card = cards[index];
    if (!card || feedback) return;
    const correct = card.correctOption === option;
    setFeedback(correct ? "correct" : "wrong");
    saveResult({ itemId: card.id, german: card.german, correct });
    setTimeout(() => {
      if (index + 1 >= cards.length) finish();
      else { setIndex(i => i + 1); setFeedback(null); }
    }, 900);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Karten werden geladen...</p>
      </div>
    );
  }

  if (!cards.length || done) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Weiter zum Gespräch...</p>
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
      <header style={{ width: "100%", maxWidth: 300, marginBottom: 18 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 300, color: "var(--text)", marginBottom: 4 }}>Aufwärmen</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>Kurz aktivieren — dann mit Maya sprechen.</p>
      </header>

      <BinaryFlashcard
        card={cards[index]}
        index={index}
        total={cards.length}
        feedback={feedback}
        onChoose={handleChoose}
      />

      <button
        onClick={() => finish()}
        style={{
          marginTop: 22, fontSize: 11, color: "var(--text-dim)",
          background: "none", border: "0.5px solid var(--border)",
          padding: "8px 16px", borderRadius: 6, cursor: "pointer",
          fontFamily: "var(--font-mono)",
        }}
      >
        Überspringen →
      </button>
    </div>
  );
}

export default function WarmupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Karten werden geladen...</p>
      </div>
    }>
      <WarmupInner />
    </Suspense>
  );
}
