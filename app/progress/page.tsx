"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  totalMessages?: number;
  newWords?: string[];
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [vocab, setVocab] = useState<{word: string, usedByUser?: boolean}[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/sessions").then(r => r.json()),
      fetch("/api/vocab").then(r => r.json()),
    ]).then(([s, v]) => {
      setSessions(s.sessions ?? []);
      setVocab(v.words ?? []);
      setLoading(false);
    });
  }, []);

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((a, s) => a + (s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : 0), 0);
  const totalWords = vocab.filter(w => !w.usedByUser).length; // words Maya used, user never said
  const totalMessages = sessions.reduce((a, s) => a + (s.totalMessages ?? 0), 0);

  // Group sessions by week
  const now = Date.now();
  const weeks = [0, 1, 2, 3].map(w => {
    const start = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
    const end = now - w * 7 * 24 * 60 * 60 * 1000;
    const weekSessions = sessions.filter(s => s.startedAt >= start && s.startedAt < end);
    return {
      label: w === 0 ? "Diese Woche" : w === 1 ? "Letzte Woche" : `Vor ${w} Wochen`,
      sessions: weekSessions.length,
      minutes: weekSessions.reduce((a, s) => a + (s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : 0), 0),
      words: weekSessions.reduce((a, s) => a + (s.newWords?.length ?? 0), 0),
    };
  });

  // Last 7 days streak calendar
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
    const hasSession = sessions.some(s => {
      const sd = new Date(s.startedAt);
      return sd.toDateString() === d.toDateString();
    });
    return { label: d.toLocaleDateString("de-DE", { weekday: "short" }), active: hasSession };
  });

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--accent)", color: "var(--bg)", padding: "2px 6px", borderRadius: 3 }}>DE</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 300 }}>Fortschritt</span>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      {/* Overall stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "16px" }}>
        {[
          { label: "Gespräche", value: totalSessions },
          { label: "Minuten gesprochen", value: totalMinutes },
          { label: "Neue Wörter", value: totalWords },
          { label: "Nachrichten", value: totalMessages },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 7 day streak */}
      <div style={{ margin: "0 16px 16px", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Letzte 7 Tage</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {days.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: d.active ? "var(--accent)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {d.active && <span style={{ fontSize: 14 }}>🔥</span>}
              </div>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly breakdown */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Wöchentlich</div>
        {weeks.map((w, i) => (
          <div key={i} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text)" }}>{w.label}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.sessions} Gespräche</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>⏱ {w.minutes} min</span>
              <span style={{ fontSize: 12, color: "var(--accent)" }}>+{w.words} Wörter</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}
