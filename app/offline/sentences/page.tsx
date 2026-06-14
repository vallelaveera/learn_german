"use client";

import { useMemo, useState } from "react";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { OfflineFilterBar } from "@/components/offline/OfflineFilterBar";
import { OfflineIllustration } from "@/components/offline/OfflineIllustration";
import { OfflineProvider, useOffline } from "@/components/offline/OfflineProvider";
import { OFFLINE_CATEGORY_LABELS, OFFLINE_LEVEL_COLORS } from "@/lib/offline/constants";
import type { OfflineLevel, OfflineWordCategory } from "@/lib/offline/types";

function OfflineSentencesInner() {
  const { sentences, loading } = useOffline();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<OfflineLevel | "all">("all");
  const [category, setCategory] = useState<OfflineWordCategory | "all">("all");

  const categories = useMemo(() => Array.from(new Set(sentences.map(s => s.category))).sort(), [sentences]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sentences.filter(s => {
      if (level !== "all" && s.level !== level) return false;
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      return s.german.toLowerCase().includes(q) || s.english.toLowerCase().includes(q);
    });
  }, [sentences, search, level, category]);

  return (
    <ExerciseShell backHref="/offline" showTabBar={false}>
      <div style={{ padding: "0 18px 24px" }}>
        <ExerciseBackLink href="/offline" label="← Offline" />
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 4px" }}>
          Satzbibliothek
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>
          {filtered.length} von {sentences.length} Sätzen
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(sentence => {
              const color = OFFLINE_LEVEL_COLORS[sentence.level];
              return (
                <div key={sentence.id} className="ui-card ui-card-padded">
                  <OfflineIllustration illustrationId={sentence.illustrationId} height={90} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: "3px 8px", borderRadius: 999 }}>
                      {sentence.level}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>
                      {OFFLINE_CATEGORY_LABELS[sentence.category as OfflineWordCategory] ?? sentence.category}
                    </span>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.45 }}>{sentence.german}</p>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 10px" }}>{sentence.english}</p>
                  {sentence.grammarNotes && (
                    <p style={{ fontSize: 12, color: "var(--accent)", margin: 0, fontWeight: 600 }}>
                      📐 {sentence.grammarNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ExerciseShell>
  );
}

export default function OfflineSentencesPage() {
  return (
    <OfflineProvider>
      <OfflineSentencesInner />
    </OfflineProvider>
  );
}
