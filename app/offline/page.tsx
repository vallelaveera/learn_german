"use client";

import Link from "next/link";
import { BookOpen, Download, Flame, Layers, MessageSquare, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { OfflineProvider, useOffline } from "@/components/offline/OfflineProvider";
import { OFFLINE_LEVELS, OFFLINE_LEVEL_COLORS } from "@/lib/offline/constants";

function OfflineHubInner() {
  const {
    words,
    sentences,
    meta,
    loading,
    syncing,
    error,
    syncStatus,
    bootstrap,
    isReady,
    progress,
    streak,
    learnedCount,
  } = useOffline();

  return (
    <PageShell title="Offline lernen" showTabBar>
      <div className="ui-page">
        <div className="ui-hero" style={{ padding: "20px 16px", marginBottom: 16 }}>
          <p className="ui-label" style={{ color: "var(--accent)", marginBottom: 6 }}>
            Offline-Bibliothek
          </p>
          <h2 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 8px" }}>
            Deutsch ohne Internet
          </h2>
          <p className="ui-muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
            Wörter, Sätze und Karteikarten — einmal laden, überall lernen.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatPill icon={<Download size={14} />} label={`${words.length} Wörter`} />
            <StatPill icon={<MessageSquare size={14} />} label={`${sentences.length} Sätze`} />
            <StatPill icon={<Flame size={14} />} label={`${streak} Tage Streak`} />
          </div>
        </div>

        {(loading || syncing) && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 12 }}>
            {syncing ? "Inhalte werden heruntergeladen…" : "Lädt…"}
          </p>
        )}

        {error && (
          <div className="ui-card ui-card-padded" style={{ marginBottom: 12, border: "1px solid var(--red)" }}>
            <p style={{ fontSize: 13, color: "var(--red)", margin: "0 0 10px" }}>{error}</p>
            <button type="button" className="ui-btn-ghost" onClick={() => void bootstrap(true)} style={{ minHeight: 44 }}>
              <RefreshCw size={14} /> Erneut versuchen
            </button>
          </div>
        )}

        {isReady && syncStatus && syncStatus !== "ready" && (
          <p style={{ fontSize: 12, color: "var(--green)", textAlign: "center", marginBottom: 12 }}>
            {syncStatus === "downloaded" ? "Bibliothek bereit — offline verfügbar." : "Bibliothek aktualisiert."}
          </p>
        )}

        {meta && (
          <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", marginBottom: 14 }}>
            Version {meta.manifestVersion} · zuletzt {new Date(meta.lastSyncAt).toLocaleDateString("de-DE")}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <HubLink href="/offline/words" icon={<BookOpen size={20} />} title="Wörterbuch" sub={`${words.length} Einträge · Suchen & filtern`} />
          <HubLink href="/offline/sentences" icon={<MessageSquare size={20} />} title="Sätze" sub={`${sentences.length} Beispielsätze mit Grammatik`} />
          <HubLink href="/offline/flashcards" icon={<Layers size={20} />} title="Karteikarten" sub={`${learnedCount} gelernt · Streak ${streak}`} accent="var(--green)" />
          <HubLink href="/offline/progress" icon={<Flame size={20} />} title="Fortschritt" sub="A1–B2 · Streak & Statistik" accent="var(--purple)" />
        </div>

        <div className="ui-card ui-card-padded">
          <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 10px" }}>Fortschritt nach Level</p>
          {OFFLINE_LEVELS.map(level => {
            const stats = progress.perLevel[level];
            const pct = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
            return (
              <div key={level} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: OFFLINE_LEVEL_COLORS[level] }}>{level}</span>
                  <span style={{ color: "var(--text-muted)" }}>{stats.learned}/{stats.total} · {pct}%</span>
                </div>
                <div className="ui-progress-track">
                  <div className="ui-progress-fill" style={{ width: `${pct}%`, background: OFFLINE_LEVEL_COLORS[level] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.7)",
        border: "1px solid var(--border-light)",
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function HubLink({
  href,
  icon,
  title,
  sub,
  accent = "var(--accent)",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="ui-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        textDecoration: "none",
        border: `1px solid ${accent}33`,
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${accent}14`,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</span>
      </span>
      <span style={{ color: accent, fontWeight: 700, fontSize: 14 }}>→</span>
    </Link>
  );
}

export default function OfflineHubPage() {
  return (
    <OfflineProvider>
      <OfflineHubInner />
    </OfflineProvider>
  );
}
