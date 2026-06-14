"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { OfflineProvider, useOffline } from "@/components/offline/OfflineProvider";
import { OfflineRevealFlashcard } from "@/components/offline/OfflineRevealFlashcard";
import { SuccessIllustration } from "@/components/illustrations/SuccessIllustration";
import type { OfflineLevel, OfflineWord } from "@/lib/offline/types";

function shuffleWords(words: OfflineWord[]): OfflineWord[] {
  const copy = [...words];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function OfflineFlashcardsInner() {
  const { words, loading, progress, recordFlashcard, streak } = useOffline();
  const [levelFilter, setLevelFilter] = useState<OfflineLevel | "all">("all");
  const [deck, setDeck] = useState<OfflineWord[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);

  const pool = useMemo(() => {
    if (levelFilter === "all") return words;
    return words.filter(w => w.level === levelFilter);
  }, [words, levelFilter]);

  const startSession = () => {
    setDeck(shuffleWords(pool));
    setIndex(0);
    setStarted(true);
    setDone(false);
    setSessionScore(0);
  };

  const advance = (learned: boolean) => {
    const word = deck[index];
    if (!word) return;
    recordFlashcard(word, learned);
    if (learned) setSessionScore(s => s + 1);
    if (index + 1 >= deck.length) {
      setDone(true);
      return;
    }
    setIndex(i => i + 1);
  };

  const current = deck[index];

  return (
    <ExerciseShell backHref="/offline" showTabBar={false}>
      <div style={{ padding: "0 18px 24px", maxWidth: 360, margin: "0 auto" }}>
        <ExerciseBackLink href="/offline" label="← Offline" />
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px" }}>
          Karteikarten
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>
          English → Deutsch · Streak {streak} 🔥
        </p>

        {loading && <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Lädt…</p>}

        {!loading && !started && !done && (
          <div className="ui-card ui-card-padded">
            <p style={{ fontSize: 14, margin: "0 0 12px", lineHeight: 1.5 }}>
              Sieh dir die Illustration und die englische Bedeutung an. Errate das deutsche Wort — tippe zum Aufdecken.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {(["all", "A1", "A2", "B1", "B2"] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevelFilter(l)}
                  style={{
                    minHeight: 36,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: levelFilter === l ? "2px solid var(--accent)" : "1px solid var(--border-light)",
                    background: levelFilter === l ? "var(--accent-soft)" : "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {l === "all" ? "Alle" : l}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
              {pool.length} Karten · {progress.learnedWordIds.length} bereits gelernt
            </p>
            <button type="button" className="ui-btn-primary" onClick={startSession} disabled={pool.length === 0} style={{ minHeight: 52 }}>
              Starten
            </button>
          </div>
        )}

        {started && !done && current && (
          <OfflineRevealFlashcard
            key={current.id}
            word={current}
            index={index}
            total={deck.length}
            onKnown={() => advance(true)}
            onPractice={() => advance(false)}
          />
        )}

        {done && (
          <div style={{ textAlign: "center" }}>
            <SuccessIllustration width={120} height={120} />
            <p style={{ fontSize: 18, fontWeight: 700, margin: "12px 0 6px" }}>Session geschafft!</p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" }}>
              {sessionScore} von {deck.length} gewusst · Streak {streak}
            </p>
            <button type="button" className="ui-btn-primary" onClick={startSession} style={{ minHeight: 48, marginBottom: 10 }}>
              Nochmal
            </button>
            <Link href="/offline" style={{ display: "block", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
              ← Zurück zur Bibliothek
            </Link>
          </div>
        )}
      </div>
    </ExerciseShell>
  );
}

export default function OfflineFlashcardsPage() {
  return (
    <OfflineProvider>
      <OfflineFlashcardsInner />
    </OfflineProvider>
  );
}
