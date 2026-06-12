"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CorpusMatrixDashboard, type MatrixCategoryRow } from "@/components/admin/CorpusMatrixDashboard";
import { AdminSubTabs, AdminCard, AdminStatGrid } from "@/components/admin/AdminShell";

const PURPLE = "#7F77DD";

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
  labelDe?: string;
  words: number;
  sentences: number;
  needsWords: number;
  needsSentences: number;
}

interface CoverageReport {
  totals: { words: number; sentences: number };
  targets: { words: number; sentences: number };
  categories: MatrixCategoryRow[];
  gaps: CoverageGap[];
}

type DashboardTab = "overview" | "corpus" | "users";

const DASHBOARD_TABS = [
  { id: "overview" as const, label: "Übersicht" },
  { id: "corpus" as const, label: "Corpus" },
  { id: "users" as const, label: "Nutzer" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
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
        if (generateData?.coverage) setCoverage(generateData.coverage);
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [router]);

  const filtered = users.filter(u =>
    search
      ? u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>;
  }

  if (error) {
    return <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>;
  }

  if (!stats) return null;

  return (
    <>
      <AdminSubTabs tabs={DASHBOARD_TABS} active={tab} onChange={id => setTab(id as DashboardTab)} />

      {tab === "overview" && (
        <>
          <AdminStatGrid stats={[
            { label: "Nutzer gesamt", value: stats.totalUsers },
            { label: "Aktiv heute", value: stats.activeToday, accent: "#059669" },
            { label: "Sessions", value: stats.totalSessions },
            { label: "Minuten", value: stats.totalMinutes },
          ]} />

          {coverage && (
            <AdminCard style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Corpus auf einen Blick
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: PURPLE, fontFamily: "var(--font-mono)" }}>{coverage.totals.words}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Wörter generiert</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: PURPLE, fontFamily: "var(--font-mono)" }}>{coverage.totals.sentences}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Sätze generiert</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: coverage.gaps.length ? "#D97706" : "#059669", fontFamily: "var(--font-mono)" }}>
                    {coverage.gaps.length}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Kategorien mit Lücken</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab("corpus")}
                style={{ fontSize: 12, color: PURPLE, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", padding: 0 }}
              >
                Matrix ansehen →
              </button>
            </AdminCard>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <Link href="/admin/content" style={{ textDecoration: "none" }}>
              <AdminCard style={{ height: "100%", cursor: "pointer", transition: "border-color 0.15s" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Übungsinhalt</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Wörter & Sätze durchsuchen</div>
                <div style={{ marginTop: 12, fontSize: 12, color: PURPLE }}>Öffnen →</div>
              </AdminCard>
            </Link>
            <Link href="/admin/generate" style={{ textDecoration: "none" }}>
              <AdminCard style={{ height: "100%", cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Inhalt generieren</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Claude-Pipeline · Kategorien & Themen</div>
                <div style={{ marginTop: 12, fontSize: 12, color: PURPLE }}>Generieren →</div>
              </AdminCard>
            </Link>
            <Link href="/admin/illustrations" style={{ textDecoration: "none" }}>
              <AdminCard style={{ height: "100%", cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>SVG Illustrationen</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>Maya-Szenen pro Kategorie generieren</div>
                <div style={{ marginTop: 12, fontSize: 12, color: PURPLE }}>Illustrationen →</div>
              </AdminCard>
            </Link>
            <button
              type="button"
              onClick={() => setTab("users")}
              style={{ textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <AdminCard style={{ height: "100%" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Nutzer</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{stats.totalUsers} registriert · {stats.activeToday} aktiv heute</div>
                <div style={{ marginTop: 12, fontSize: 12, color: PURPLE }}>Liste →</div>
              </AdminCard>
            </button>
          </div>
        </>
      )}

      {tab === "corpus" && coverage && (
        <>
          <AdminCard style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Corpus-Matrix</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Kategorien × Level — Wörter & Sätze</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                {coverage.totals.words} W · {coverage.totals.sentences} S
              </div>
            </div>
            <CorpusMatrixDashboard
              categories={coverage.categories}
              targets={coverage.targets}
              onCellClick={cell => {
                const q = new URLSearchParams({
                  category: cell.category,
                  level: cell.level,
                  type: cell.type,
                  tab: "generate",
                });
                router.push(`/admin/generate?${q.toString()}`);
              }}
            />
          </AdminCard>

          {coverage.gaps.length > 0 && (
            <AdminCard style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
              <div style={{ fontSize: 11, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Lücken ({coverage.gaps.length} Kategorien)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {coverage.gaps.map(gap => (
                  <div key={gap.category} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#B45309",
                    fontFamily: "var(--font-mono)",
                    flexWrap: "wrap",
                  }}>
                    <span style={{ fontWeight: 500 }}>{gap.labelDe ?? gap.category}</span>
                    <span>
                      {gap.words} W · {gap.sentences} S
                      {(gap.needsWords > 0 || gap.needsSentences > 0) && (
                        <span style={{ color: "#92400E" }}> · −{gap.needsWords} W / −{gap.needsSentences} S</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/admin/generate" style={{ fontSize: 12, color: PURPLE, fontWeight: 600, textDecoration: "none" }}>
                Lücken füllen →
              </Link>
            </AdminCard>
          )}
        </>
      )}

      {tab === "corpus" && !coverage && (
        <AdminCard>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Corpus-Daten nicht verfügbar.</p>
        </AdminCard>
      )}

      {tab === "users" && (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name oder E-Mail suchen…"
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: 10,
              color: "var(--text)",
              fontSize: 15,
              fontFamily: "var(--font-mono)",
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
            {filtered.length} von {users.length} Nutzer
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(u => (
              <Link key={u.userId} href={`/admin/user?id=${u.userId}`} style={{ textDecoration: "none" }}>
                <AdminCard style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "color-mix(in srgb, #7F77DD 15%, var(--bg))",
                    border: "1px solid color-mix(in srgb, #7F77DD 30%, var(--border))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: PURPLE }}>{u.name[0]?.toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{u.name}</span>
                      {u.streak > 0 && <span style={{ fontSize: 11, color: PURPLE }}>🔥 {u.streak}</span>}
                      <span style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        background: "var(--bg)",
                        border: "0.5px solid var(--border)",
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontFamily: "var(--font-mono)",
                      }}>
                        {u.germanLevel ?? "?"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{u.email}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-dim)", flexWrap: "wrap" }}>
                      <span>{u.totalSessions} Sessions</span>
                      <span>{u.totalMinutes} min</span>
                      <span>Zuletzt {fmt(u.lastActiveAt)}</span>
                    </div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: 18 }}>→</span>
                </AdminCard>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
