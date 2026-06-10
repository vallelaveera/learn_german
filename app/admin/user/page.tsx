"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  totalMessages: number;
  newWords: number;
  title?: string;
  messages: { role: string; content: string; translation?: string }[];
}

export default function AdminUserPage() {
  return <Suspense fallback={<div style={{padding:24,color:"var(--text-muted)"}}>Lädt...</div>}><AdminUserContent /></Suspense>;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
}

interface Profile {
  name: string;
  email: string;
  germanLevel?: string;
  streak: number;
  totalSessions: number;
  createdAt: number;
  lastActiveAt: number;
  facts: Record<string, unknown>;
}

function AdminUserContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vocab, setVocab] = useState<{ total: number; learned: number; new: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [newLimit, setNewLimit] = useState("");
  const [limitSaved, setLimitSaved] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("id");

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/admin/user?userId=${userId}`)
      .then(r => { if (r.status === 401) { router.push("/mode"); return null; } return r.json(); })
      .then(d => {
        if (!d) return;
        setProfile(d.profile);
        setSessions(d.sessions);
        setVocab(d.vocab);
        setUsage(d.usage);
        setLoading(false);
      });
  }, [userId]);

  const fmt = (ts: number) => new Date(ts).toLocaleDateString("de-DE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const dur = (s: Session) => {
    if (!s.endedAt) return "—";
    const mins = Math.round((s.endedAt - s.startedAt) / 60000);
    return mins < 1 ? "<1 min" : `${mins} min`;
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--red)", color: "white", padding: "2px 6px", borderRadius: 3 }}>ADMIN</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 300 }}>Nutzerprofil</span>
        </div>
        <Link href="/admin" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      {loading && <p style={{ color: "var(--text-muted)", fontSize: 13, padding: 24 }}>Lädt...</p>}

      {!loading && profile && (
        <div style={{ padding: 16 }}>
          {/* Profile card */}
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--accent)" }}>{profile.name[0]?.toUpperCase()}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{profile.email}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile.germanLevel && <span style={{ fontSize: 10, background: "var(--accent-glow)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)", padding: "2px 8px", borderRadius: 4 }}>{profile.germanLevel}</span>}
                {profile.streak > 0 && <span style={{ fontSize: 10, color: "var(--accent)" }}>🔥 {profile.streak} Tage</span>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Sessions", value: sessions.length },
              { label: "Neue Wörter", value: vocab?.new ?? 0 },
              { label: "Gelernt", value: vocab?.learned ?? 0 },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* What Maya knows */}
          {Object.keys(profile.facts).length > 0 && (
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Profil</div>
              {(Object.entries(profile.facts) as [string, unknown][])
                .filter(([k]) => !["lastUpdated", "askedTopics", "askedQuestions", "personalDetails"].includes(k))
                .filter(([, v]) => !!v)
                .map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", minWidth: 100 }}>{k}</span>
                    <span style={{ fontSize: 12, color: "var(--text)" }}>{Array.isArray(v) ? (v as string[]).join(", ") : String(v)}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Usage + limit control */}
          {usage && (
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Nutzung diesen Monat</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text)" }}>{usage.used} / {usage.limit} Minuten</span>
                <span style={{ fontSize: 12, color: usage.remaining < 5 ? "var(--red)" : "var(--green)" }}>{usage.remaining} verbleibend</span>
              </div>
              <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ height: "100%", borderRadius: 2, background: usage.remaining < 5 ? "var(--red)" : "var(--accent)", width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Limit ändern</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newLimit}
                  onChange={e => setNewLimit(e.target.value)}
                  placeholder={String(usage.limit)}
                  type="number"
                  style={{ flex: 1, padding: "8px 12px", background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 16, fontFamily: "var(--font-mono)" }}
                />
                <button
                  onClick={async () => {
                    if (!newLimit || !userId) return;
                    await fetch("/api/admin/limit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId, minutes: Number(newLimit) }),
                    });
                    setUsage(prev => prev ? { ...prev, limit: Number(newLimit), remaining: Number(newLimit) - prev.used } : prev);
                    setLimitSaved(true);
                    setTimeout(() => setLimitSaved(false), 2000);
                  }}
                  style={{ padding: "8px 16px", background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)", borderRadius: 6, color: "var(--accent)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-mono)" }}
                >
                  {limitSaved ? "✓ Gespeichert" : "Speichern"}
                </button>
              </div>
            </div>
          )}

          {/* Sessions list */}
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Sessions ({sessions.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {sessions.map(s => (
              <button key={s.id} onClick={() => setSelectedSession(selectedSession?.id === s.id ? null : s)} style={{ background: "var(--surface)", border: `0.5px solid ${selectedSession?.id === s.id ? "var(--accent-dim)" : "var(--border)"}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text)" }}>{fmt(s.startedAt)}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{dur(s)}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.totalMessages} msg</span>
                    {s.newWords > 0 && <span style={{ fontSize: 11, color: "var(--accent)" }}>+{s.newWords} Wörter</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title ?? "Gespräch"}</div>

                {/* Transcript */}
                {selectedSession?.id === s.id && (
                  <div style={{ marginTop: 12, borderTop: "0.5px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {s.messages?.map((msg, i) => (
                      <div key={i} style={{ padding: "6px 10px", borderRadius: 8, background: msg.role === "user" ? "rgba(255,255,255,0.04)" : "rgba(212,168,67,0.06)", borderLeft: `2px solid ${msg.role === "assistant" ? "var(--accent-dim)" : "rgba(255,255,255,0.1)"}` }}>
                        <div style={{ fontSize: 9, color: msg.role === "assistant" ? "var(--accent)" : "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                          {msg.role === "user" ? profile.name : "Maya"}
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
                        {msg.translation && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, fontStyle: "italic" }}>💡 {msg.translation}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
