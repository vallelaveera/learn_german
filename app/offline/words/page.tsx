"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { OfflineFilterBar } from "@/components/offline/OfflineFilterBar";
import { OfflineProvider, useOffline } from "@/components/offline/OfflineProvider";
import { WordDetailSheet } from "@/components/offline/WordDetailSheet";
import { OFFLINE_CATEGORY_LABELS, OFFLINE_LEVEL_COLORS } from "@/lib/offline/constants";
import type { OfflineLevel, OfflineWord, OfflineWordCategory } from "@/lib/offline/types";

function OfflineWordsInner() {
  const { words, loading, progress, recordSeen } = useOffline();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<OfflineLevel | "all">("all");
  const [category, setCategory] = useState<OfflineWordCategory | "all">("all");
  const [selected, setSelected] = useState<OfflineWord | null>(null);

  const categories = useMemo(() => Array.from(new Set(words.map(w => w.category))).sort(), [words]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return words.filter(w => {
      if (level !== "all" && w.level !== level) return false;
      if (category !== "all" && w.category !== category) return false;
      if (!q) return true;
      return (
        w.german.toLowerCase().includes(q) ||
        w.english.toLowerCase().includes(q) ||
        w.exampleDe.toLowerCase().includes(q)
      );
    });
  }, [words, search, level, category]);

  const openWord = (word: OfflineWord) => {
    recordSeen(word);
    setSelected(word);
  };

  return (
    <ExerciseShell backHref="/offline" showTabBar={false}>
      <div style={{ padding: "0 18px 24px" }}>
        <ExerciseBackLink href="/offline" label="← Offline" />
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px" }}>
          Wörterbuch
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>
          {filtered.length} von {words.length} Wörtern
        </p>

        <OfflineFilterBar
          search={search}
          onSearchChange={setSearch}
          level={level}
          onLevelChange={setLevel}
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
        />

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Lädt…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(word => {
              const learned = progress.learnedWordIds.includes(word.id);
              const color = OFFLINE_LEVEL_COLORS[word.level];
              return (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => openWord(word)}
                  className="ui-card"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 14px",
                    border: learned ? "1px solid var(--green)" : "1px solid var(--border-light)",
                    cursor: "pointer",
                    minHeight: 56,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>{word.german}</p>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{word.english}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: "3px 7px", borderRadius: 999, flexShrink: 0 }}>
                      {word.level}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "6px 0 0" }}>
                    {OFFLINE_CATEGORY_LABELS[word.category] ?? word.category}
                    {learned ? " · gelernt" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <Link href="/offline/flashcards" style={{ display: "block", marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
          Karteikarten üben →
        </Link>
      </div>

      <WordDetailSheet
        word={selected}
        learned={selected ? progress.learnedWordIds.includes(selected.id) : false}
        onClose={() => setSelected(null)}
      />
    </ExerciseShell>
  );
}

export default function OfflineWordsPage() {
  return (
    <OfflineProvider>
      <OfflineWordsInner />
    </OfflineProvider>
  );
}
