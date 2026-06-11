"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Session, Message } from "@/lib/types";

interface VocabWord {
  word: string;
  usedByUser?: boolean;
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const deleteSession = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions(prev => prev.filter(x => x.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const duration = (s: Session) => {
    if (!s.endedAt) return "—";
    const secs = Math.round((s.endedAt - s.startedAt) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.round(secs / 60)} min`;
  };

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce(
    (a, s) => a + (s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : 0),
    0,
  );
  const totalWords = vocab.filter(w => !w.usedByUser).length;
  const totalMessages = sessions.reduce((a, s) => a + (s.totalMessages ?? s.messages?.length ?? 0), 0);

  const now = Date.now();
  const weeks = [0, 1, 2, 3].map(w => {
    const start = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
    const end = now - w * 7 * 24 * 60 * 60 * 1000;
    const weekSessions = sessions.filter(s => s.startedAt >= start && s.startedAt < end);
    return {
      label: w === 0 ? "Diese Woche" : w === 1 ? "Letzte Woche" : `Vor ${w} Wochen`,
      sessions: weekSessions.length,
      minutes: weekSessions.reduce(
        (a, s) => a + (s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : 0),
        0,
      ),
      words: weekSessions.reduce((a, s) => a + (s.newWords?.length ?? 0), 0),
    };
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
    const hasSession = sessions.some(s => {
      const sd = new Date(s.startedAt);
      return sd.toDateString() === d.toDateString();
    });
    return { label: d.toLocaleDateString("de-DE", { weekday: "short" }), active: hasSession };
  });

  return (
    <PageShell title="Fortschritt">
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Gespräche", value: totalSessions },
            { label: "Minuten", value: totalMinutes },
            { label: "Neue Wörter", value: totalWords },
            { label: "Nachrichten", value: totalMessages },
          ].map(s => (
            <div
              key={s.label}
              style={{
                background: "var(--surface)",
                border: "0.5px solid var(--border)",
                borderRadius: 12,
                padding: "14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginBottom: 16,
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Letzte 7 Tage
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {days.map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: d.active ? "var(--accent)" : "var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {d.active && <span style={{ fontSize: 14 }}>🔥</span>}
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Wöchentlich
          </div>
          {weeks.map((w, i) => (
            <div
              key={i}
              style={{
                background: "var(--surface)",
                border: "0.5px solid var(--border)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 8,
              }}
            >
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

        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Verlauf
        </div>

        {loading && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Lädt...</p>}

        {!loading && sessions.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>Noch keine Gespräche gespeichert.</p>
            <Link href="/call" style={{ color: "#7F77DD", fontSize: 13 }}>
              Jetzt üben →
            </Link>
          </div>
        )}

        {!loading &&
          sessions.map(s => {
            const open = expandedId === s.id;
            return (
              <div
                key={s.id}
                style={{
                  background: "var(--surface)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 12,
                  marginBottom: 8,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : s.id)}
                  style={{
                    width: "100%",
                    minHeight: 44,
                    padding: "14px",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "var(--text)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(s.startedAt)}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
                  </div>
                  <div style={{ fontSize: 14, fontFamily: "var(--font-serif)", marginBottom: 6 }}>
                    {s.title ?? "Gespräch"}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
                    <span>{s.messages?.length ?? 0} Nachrichten</span>
                    <span>{duration(s)}</span>
                  </div>
                </button>

                {open && (
                  <div style={{ padding: "0 14px 14px", borderTop: "0.5px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, marginBottom: 12 }}>
                      {(s.messages ?? []).map((msg: Message, i: number) => (
                        <div
                          key={i}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: msg.role === "user" ? "var(--bg)" : "var(--accent-glow)",
                            border: "0.5px solid var(--border)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: msg.role === "assistant" ? "var(--accent)" : "var(--text-dim)",
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            {msg.role === "user" ? "Du" : "Maya"}
                          </div>
                          <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
                          {msg.translation && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                              💡 {msg.translation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSession(s.id)}
                      style={{
                        minHeight: 44,
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "0.5px solid rgba(192,57,43,0.35)",
                        background: "rgba(192,57,43,0.08)",
                        color: "var(--red)",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </PageShell>
  );
}
