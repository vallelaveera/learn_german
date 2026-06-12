"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Clock, BookOpen, MessagesSquare, Flame, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressIllustration } from "@/components/illustrations/ProgressIllustration";
import { Session, Message } from "@/lib/types";

interface VocabWord {
  word: string;
  firstSeen?: number;
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
      words: vocab.filter(w => {
        const seen = w.firstSeen ?? 0;
        return seen >= start && seen < end;
      }).length,
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
    <PageShell
      title="Fortschritt"
      showTabBar
      headerRight={
        <Link href="/profile" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
          Profil
        </Link>
      }
    >
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <ProgressIllustration width={220} height={174} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <StatTile label="Gespräche" value={totalSessions} icon={<MessageSquare size={18} />} />
          <StatTile label="Minuten" value={totalMinutes} icon={<Clock size={18} />} />
          <StatTile label="Neue Wörter" value={totalWords} icon={<BookOpen size={18} />} accent="var(--green)" />
          <StatTile label="Nachrichten" value={totalMessages} icon={<MessagesSquare size={18} />} />
        </div>

        <div className="ui-card ui-card-padded" style={{ marginBottom: 16 }}>
          <div className="ui-label" style={{ marginBottom: 12 }}>Letzte 7 Tage</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {days.map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: d.active ? "var(--gradient)" : "var(--border-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: d.active ? "var(--shadow-sm)" : "none",
                  }}
                >
                  {d.active && <Flame size={16} color="#fff" />}
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="ui-label" style={{ marginBottom: 12 }}>Wöchentlich</div>
          {weeks.map((w, i) => (
            <div key={i} className="ui-card ui-card-padded" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text)" }}>{w.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.sessions} Gespräche</span>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={13} /> {w.minutes} min
                </span>
                <span style={{ fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <BookOpen size={13} /> +{w.words} Wörter
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="ui-label" style={{ marginBottom: 12 }}>Verlauf</div>

        {loading && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Lädt...</p>}

        {!loading && sessions.length === 0 && (
          <EmptyState
            icon={<MessageSquare size={28} />}
            title="Noch keine Gespräche"
            description="Starte ein Gespräch mit Maya — dein Verlauf erscheint hier."
            actionLabel="Jetzt üben"
            actionHref="/call"
          />
        )}

        {!loading &&
          sessions.map(s => {
            const open = expandedId === s.id;
            return (
              <div key={s.id} className="ui-card" style={{ marginBottom: 8, overflow: "hidden" }}>
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
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
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
                      className="ui-btn-ghost"
                      style={{ width: "100%", color: "var(--red)", borderColor: "rgba(192,57,43,0.25)", background: "rgba(192,57,43,0.06)" }}
                    >
                      <Trash2 size={14} />
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
