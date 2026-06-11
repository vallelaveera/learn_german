"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserSummary {
  userId: string;
  name: string;
  email: string;
  germanLevel?: string;
  streak: number;
  totalSessions: number;
  totalMinutes: number;
  lastActiveAt: number;
  createdAt: number;
}

interface Stats {
  totalUsers: number;
  activeToday: number;
  totalSessions: number;
  totalMinutes: number;
}

interface CoverageGap {
  category: string;
  words: number;
  sentences: number;
  needsWords: number;
  needsSentences: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  career: "Karriere",
  travel: "Reisen",
  food: "Essen",
  health: "Gesundheit",
  housing: "Wohnen",
  daily_life: "Alltag",
  finance: "Finanzen",
  transport: "Transport",
  social: "Soziales",
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [contentGaps, setContentGaps] = useState<CoverageGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin").then(r => {
        if (r.status === 401) { router.push("/mode"); return null; }
        return r.json();
      }),
      fetch("/api/admin/generate").then(r => r.ok ? r.json() : null),
    ])
      .then(([adminData, generateData]) => {
        if (adminData) {
          setStats(adminData.stats);
          setUsers(adminData.users);
        }
        if (generateData?.coverage?.gaps) {
          setContentGaps(generateData.coverage.gaps.slice(0, 4));
        }
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [router]);

  const filtered = users.filter(u =>
    search ? (u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())) : true
  );

  const fmt = (ts: number) => new Date(ts).toLocaleDateString("de-DE", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--red)", color: "white", padding: "2px 6px", borderRadius: 3 }}>ADMIN</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 300 }}>CallMeDaily</span>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← App</Link>
      </header>

      {loading && <p style={{ color: "var(--text-muted)", fontSize: 13, padding: 24 }}>Lädt...</p>}
      {error && <p style={{ color: "var(--red)", fontSize: 13, padding: 24 }}>{error}</p>}

      {!loading && stats && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "16px" }}>
            {[
              { label: "Nutzer gesamt", value: stats.totalUsers },
              { label: "Aktiv heute", value: stats.activeToday },
              { label: "Sessions gesamt", value: stats.totalSessions },
              { label: "Minuten gesprochen", value: stats.totalMinutes },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {contentGaps.length > 0 && (
            <div style={{ padding: "0 16px 12px" }}>
              <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Inhalt-Lücken (generiert)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {contentGaps.map(gap => (
                    <div key={gap.category} style={{ fontSize: 12, color: "#B45309", fontFamily: "var(--font-mono)" }}>
                      {CATEGORY_LABELS[gap.category] ?? gap.category}: {gap.words} W · {gap.sentences} S
                      {(gap.needsWords > 0 || gap.needsSentences > 0) && (
                        <span style={{ color: "#92400E" }}> — fehlen ~{gap.needsWords} W, ~{gap.needsSentences} S</span>
                      )}
                    </div>
                  ))}
                </div>
                <Link href="/admin/generate" style={{ fontSize: 12, color: "#7F77DD", fontWeight: 500, textDecoration: "none" }}>
                  Inhalt generieren →
                </Link>
              </div>
            </div>
          )}

          {/* Content catalog */}
          <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/admin/content" style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>Übungsinhalt</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Wörter & Sätze in der App ansehen</div>
                </div>
                <span style={{ color: "var(--text-dim)", fontSize: 16 }}>→</span>
              </div>
            </Link>
            <Link href="/admin/generate" style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>Inhalt generieren</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Wörter & Sätze mit Claude erstellen</div>
                </div>
                <span style={{ color: "var(--text-dim)", fontSize: 16 }}>→</span>
              </div>
            </Link>
          </div>

          {/* Search */}
          <div style={{ padding: "0 16px 12px" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nutzer suchen..."
              style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 16, fontFamily: "var(--font-mono)" }}
            />
          </div>

          {/* User list */}
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(u => (
              <Link key={u.userId} href={`/admin/user?id=${u.userId}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--accent)" }}>{u.name[0]?.toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{u.name}</span>
                      {u.streak > 0 && <span style={{ fontSize: 11, color: "var(--accent)" }}>🔥 {u.streak}</span>}
                      <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface)", border: "0.5px solid var(--border)", padding: "1px 6px", borderRadius: 4 }}>{u.germanLevel ?? "?"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{u.email}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-dim)" }}>
                      <span>{u.totalSessions} Sessions</span>
                      <span>{u.totalMinutes} min</span>
                      <span>Zuletzt: {fmt(u.lastActiveAt)}</span>
                    </div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: 16 }}>→</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ height: 32 }} />
        </>
      )}
    </div>
  );
}
