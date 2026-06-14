"use client";

import Link from "next/link";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { OfflineProvider, useOffline } from "@/components/offline/OfflineProvider";
import { OFFLINE_LEVELS, OFFLINE_LEVEL_COLORS } from "@/lib/offline/constants";

function OfflineProgressInner() {
  const { progress, words, sentences, streak, learnedCount, bootstrap, syncing } = useOffline();

  return (
    <ExerciseShell backHref="/offline" showTabBar={false}>
      <div style={{ padding: "0 18px 24px" }}>
        <ExerciseBackLink href="/offline" label="← Offline" />
        <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 14px" }}>
          Fortschritt
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Streak", value: `${streak} Tage`, emoji: "🔥" },
            { label: "Gelernt", value: String(learnedCount), emoji: "✓" },
            { label: "Wörter", value: String(words.length), emoji: "📚" },
            { label: "Sessions", value: String(progress.flashcardSessions), emoji: "🎯" },
          ].map(stat => (
            <div key={stat.label} className="ui-card ui-card-padded">
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 4px" }}>{stat.label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                {stat.emoji} {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="ui-card ui-card-padded" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>Nach CEFR-Level</p>
          {OFFLINE_LEVELS.map(level => {
            const stats = progress.perLevel[level];
            const pct = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
            return (
              <div key={level} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: OFFLINE_LEVEL_COLORS[level] }}>{level}</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {stats.learned}/{stats.total} gelernt · {stats.seen} gesehen
                  </span>
                </div>
                <div className="ui-progress-track">
                  <div className="ui-progress-fill" style={{ width: `${pct}%`, background: OFFLINE_LEVEL_COLORS[level] }} />
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
          {sentences.length} Sätze in der Bibliothek. Wöchentliche Updates werden im Hintergrund geladen, wenn du online bist.
        </p>

        <button
          type="button"
          className="ui-btn-ghost"
          disabled={syncing}
          onClick={() => void bootstrap(true)}
          style={{ width: "100%", minHeight: 48, marginBottom: 12 }}
        >
          {syncing ? "Synchronisiert…" : "Jetzt synchronisieren"}
        </button>

        <Link href="/offline/flashcards" className="ui-btn-primary" style={{ display: "flex", minHeight: 52, textDecoration: "none" }}>
          Karteikarten üben
        </Link>
      </div>
    </ExerciseShell>
  );
}

export default function OfflineProgressPage() {
  return (
    <OfflineProvider>
      <OfflineProgressInner />
    </OfflineProvider>
  );
}
