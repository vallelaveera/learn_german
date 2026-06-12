"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BinaryFlashcard } from "@/components/BinaryFlashcard";
import { ExerciseShell } from "@/components/layout/ExerciseShell";
import type { ExerciseDirection } from "@/components/DirectionToggle";
import {
  getWordCategoryMeta,
  type WordExerciseCategory,
} from "@/lib/exercises/categories";
import type { BinaryCard } from "@/lib/exercises/types";

interface WordsPracticeProps {
  category: WordExerciseCategory;
  scenarioId?: string | null;
}

export function WordsPractice({ category, scenarioId }: WordsPracticeProps) {
  const router = useRouter();
  const meta = getWordCategoryMeta(category);
  const [cards, setCards] = useState<BinaryCard[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [direction, setDirection] = useState<ExerciseDirection>("de-en");

  const loadCards = useCallback(async (isMore = false) => {
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    setNoMore(false);
    try {
      const scenarioQuery = scenarioId ? `&scenario=${encodeURIComponent(scenarioId)}` : "";
      const res = await fetch(`/api/exercises/warmup?category=${category}${scenarioQuery}`);
      if (res.status === 401) { router.push("/login"); return false; }
      const data = await res.json();
      if (!data?.cards?.length) {
        if (isMore) setNoMore(true);
        else setCards([]);
        return false;
      }
      setCards(data.cards);
      setIndex(0);
      setScore(0);
      setFeedback(null);
      setDone(false);
      return true;
    } finally {
      if (isMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, [category, scenarioId, router]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

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
    const correct = direction === "en-de"
      ? card.deCorrectOption === option
      : card.correctOption === option;
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
      <ExerciseShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh", padding: 24 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Wörter werden geladen...</p>
        </div>
      </ExerciseShell>
    );
  }

  if (!cards.length) {
    return (
      <ExerciseShell>
        <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>{meta?.emoji ?? "📚"}</p>
        <p style={{ marginTop: 40, color: "var(--text-muted)" }}>Keine Wörter in dieser Kategorie.</p>
        <Link href="/exercises/words" style={{ color: "var(--accent)", marginTop: 16, display: "inline-block" }}>
          ← Andere Kategorie
        </Link>
        </div>
      </ExerciseShell>
    );
  }

  if (done) {
    return (
      <ExerciseShell>
      <div style={{
        padding: 24,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        minHeight: "70dvh",
      }}>
        <span
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: meta?.gradient ?? "var(--gradient)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            marginBottom: 16,
            boxShadow: `0 8px 28px ${meta?.shadow ?? "var(--accent-glow)"}`,
          }}
        >
          {meta?.emoji ?? "📚"}
        </span>
        <h1 className="ui-title-serif" style={{ fontSize: 26, marginBottom: 8 }}>
          {score} / {cards.length} richtig
        </h1>
        <p className="ui-muted" style={{ marginBottom: noMore ? 12 : 28 }}>
          {meta?.label ?? "Wörter üben"}
        </p>
        {noMore && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
            Keine neuen Wörter gerade — probier eine andere Kategorie.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
          {!noMore && (
            <button
              type="button"
              onClick={() => void loadCards(true)}
              disabled={loadingMore}
              className="ui-btn-primary"
              style={{ fontSize: 14, opacity: loadingMore ? 0.7 : 1, cursor: loadingMore ? "wait" : "pointer" }}
            >
              {loadingMore ? "Lädt..." : "Weiter üben"}
            </button>
          )}
          <Link href="/exercises/words" className="ui-btn-ghost" style={{ textDecoration: "none", minHeight: 48, justifyContent: "center" }}>
            Kategorien
          </Link>
        </div>
      </div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell>
    <div style={{ paddingLeft: 20, paddingRight: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <header style={{ width: "100%", maxWidth: 300, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: meta?.gradient ?? "var(--gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {meta?.emoji ?? "📚"}
          </span>
          <div>
            <p className="ui-title-serif" style={{ fontSize: 18, marginBottom: 4 }}>{meta?.label ?? "Wörter"}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
              {direction === "de-en"
                ? "Deutsch — wähle die Bedeutung"
                : "English — wähle das Deutsch"}
            </p>
          </div>
        </div>
        <Link href="/exercises/words" style={{ fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 10, textDecoration: "none" }}>←</Link>
      </header>

      <BinaryFlashcard
        card={cards[index]}
        index={index}
        total={cards.length}
        feedback={feedback}
        onChoose={handleChoose}
        direction={direction}
        onDirectionChange={setDirection}
        showWordExamples
      />
    </div>
    </ExerciseShell>
  );
}
