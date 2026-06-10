"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Status = "all" | "used" | "exposed" | "unused";

interface ReportCategory {
  id: string;
  label: string;
  color?: string;
  total: number;
  used: number;
  exposed: number;
  unused: number;
  coveragePct: number;
}

interface ReportEntry {
  id: string;
  text: string;
  english: string;
  category: string;
  level: string;
  priority: string;
  industries: string[];
  status: "used" | "exposed" | "unused";
  timesUsed: number;
}

interface Report {
  summary: {
    total: number;
    used: number;
    exposedOnly: number;
    unused: number;
    coveragePct: number;
  };
  categories: ReportCategory[];
  industries: string[];
  entries: ReportEntry[];
}

const STATUS_LABELS: Record<Status, string> = {
  all: "Alle",
  used: "Gesagt",
  exposed: "Gehört",
  unused: "Noch nie",
};

function statusColor(status: ReportEntry["status"]): string {
  if (status === "used") return "var(--green)";
  if (status === "exposed") return "var(--purple)";
  return "var(--text-dim)";
}

export default function CareerPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [sentences, setSentences] = useState<Record<string, string[]>>({});
  const [translations, setTranslations] = useState<Record<string, string[]>>({});
  const [loadingSentences, setLoadingSentences] = useState<string | null>(null);
  const [loadingTranslations, setLoadingTranslations] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});

  const loadReport = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (industry) params.set("industry", industry);
    if (status !== "all") params.set("status", status);

    fetch(`/api/career-vocab?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category, industry, status]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const fetchSentences = async (word: string) => {
    if (expandedWord === word) { setExpandedWord(null); return; }
    setExpandedWord(word);
    if (sentences[word]) return;
    setLoadingSentences(word);
    try {
      const res = await fetch(`/api/examples?word=${encodeURIComponent(word)}&type=sentences&context=career`);
      const data = await res.json();
      setSentences(prev => ({ ...prev, [word]: data.data ?? [] }));
    } catch {}
    setLoadingSentences(null);
  };

  const fetchTranslations = async (word: string) => {
    if (translations[word]) {
      setShowTranslation(prev => ({ ...prev, [word]: !prev[word] }));
      return;
    }
    setLoadingTranslations(word);
    try {
      const res = await fetch(`/api/examples?word=${encodeURIComponent(word)}&type=translations&context=career`);
      const data = await res.json();
      setTranslations(prev => ({ ...prev, [word]: data.data ?? [] }));
      setShowTranslation(prev => ({ ...prev, [word]: true }));
    } catch {}
    setLoadingTranslations(null);
  };

  const runBackfill = async () => {
    setBackfilling(true);
    try {
      await fetch("/api/backfill");
      loadReport();
    } finally {
      setBackfilling(false);
    }
  };

  const filteredEntries = (report?.entries ?? []).filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.text.toLowerCase().includes(q) ||
      e.english.toLowerCase().includes(q)
    );
  });

  const summary = report?.summary;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--purple)", color: "#fff", padding: "2px 6px", borderRadius: 3 }}>DE</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 300 }}>Karriere-Deutsch</span>
        </div>
        <Link href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Zurück</Link>
      </header>

      {loading && !report ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Laden…</div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ padding: 16 }}>
            <div style={{ background: "var(--gradient-soft)", border: "0.5px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Abdeckung</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 42, fontWeight: 500, color: "var(--purple)", fontFamily: "var(--font-serif)" }}>
                  {summary?.coveragePct ?? 0}%
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {summary?.used ?? 0} von {summary?.total ?? 0} Begriffen gesagt
                </span>
              </div>
              <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${summary?.coveragePct ?? 0}%`, background: "var(--gradient)", borderRadius: 4, transition: "width 0.3s" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Gesagt", value: summary?.used ?? 0, color: "var(--green)" },
                { label: "Gehört", value: summary?.exposedOnly ?? 0, color: "var(--purple)" },
                { label: "Offen", value: summary?.unused ?? 0, color: "var(--accent)" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 500, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category bars */}
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Nach Kategorie</div>
            {(report?.categories ?? []).map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(category === cat.id ? "" : cat.id)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  background: category === cat.id ? "var(--accent-glow)" : "var(--surface)",
                  border: `0.5px solid ${category === cat.id ? "var(--accent-dim)" : "var(--border)"}`,
                  borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{cat.label}</span>
                  <span style={{ fontSize: 12, color: cat.color ?? "var(--purple)", fontWeight: 500 }}>{cat.coveragePct}%</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${cat.coveragePct}%`, background: cat.color ?? "var(--purple)", borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                  {cat.used} gesagt · {cat.exposed} gehört · {cat.unused} offen
                </div>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen…"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "0.5px solid var(--border)", background: "var(--surface)",
                fontSize: 13, color: "var(--text)",
              }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["all", "unused", "exposed", "used"] as Status[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    fontSize: 11, padding: "6px 10px", borderRadius: 20, cursor: "pointer",
                    border: `0.5px solid ${status === s ? "var(--purple)" : "var(--border)"}`,
                    background: status === s ? "rgba(124,77,170,0.1)" : "var(--surface)",
                    color: status === s ? "var(--purple)" : "var(--text-muted)",
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {(report?.industries ?? []).length > 0 && (
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                style={{
                  padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--border)",
                  background: "var(--surface)", fontSize: 12, color: "var(--text)",
                }}
              >
                <option value="">Alle Branchen</option>
                {(report?.industries ?? []).map(ind => (
                  <option key={ind} value={ind}>{ind.replace(/-/g, " ")}</option>
                ))}
              </select>
            )}
          </div>

          {/* Word list */}
          <div style={{ padding: "0 16px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
              {filteredEntries.length} Begriffe
            </div>
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                style={{
                  background: "var(--surface)", border: "0.5px solid var(--border)",
                  borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                  borderLeft: `3px solid ${statusColor(entry.status)}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{entry.text}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{entry.english}</div>
                  </div>
                  <span style={{
                    fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: statusColor(entry.status), flexShrink: 0, marginTop: 2,
                  }}>
                    {entry.status === "used" ? `✓ ${entry.timesUsed}×` : entry.status === "exposed" ? "gehört" : "offen"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>{entry.level}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>{entry.priority}</span>
                </div>

                <button
                  onClick={() => fetchSentences(entry.text)}
                  style={{
                    marginTop: 8, fontSize: 10, color: "var(--purple)",
                    background: "none", border: "0.5px solid rgba(124,77,170,0.35)",
                    borderRadius: 4, padding: "2px 8px", cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {loadingSentences === entry.text ? "..." : expandedWord === entry.text ? "▲ Beispiele" : "▼ Beispiele"}
                </button>

                {expandedWord === entry.text && sentences[entry.text] && (
                  <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--bg)", borderRadius: 6, border: "0.5px solid var(--border)" }}>
                    {sentences[entry.text].map((s, i) => (
                      <p key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: i > 0 ? "6px 0 0" : 0, fontStyle: "italic" }}>
                        &quot;{s}&quot;
                      </p>
                    ))}

                    {showTranslation[entry.text] && translations[entry.text] && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
                        {translations[entry.text].map((t, i) => (
                          <p key={i} style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, margin: i > 0 ? "4px 0 0" : 0 }}>
                            {i + 1}. {t}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => fetchTranslations(entry.text)}
                      style={{
                        marginTop: 10, fontSize: 10, color: "var(--text-muted)",
                        background: "none", border: "0.5px solid var(--border)",
                        borderRadius: 4, padding: "2px 10px", cursor: "pointer",
                        fontFamily: "var(--font-mono)", display: "block",
                      }}
                    >
                      {loadingTranslations === entry.text ? "..." : showTranslation[entry.text] ? "EN verbergen" : "EN anzeigen"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Backfill past sessions */}
          <div style={{ padding: 16, textAlign: "center" }}>
            <button
              onClick={runBackfill}
              disabled={backfilling}
              style={{
                fontSize: 11, color: "var(--text-muted)", background: "var(--surface)",
                border: "0.5px solid var(--border)", padding: "8px 14px", borderRadius: 8,
                cursor: backfilling ? "wait" : "pointer",
              }}
            >
              {backfilling ? "Scanne Verlauf…" : "Vergangene Gespräche scannen"}
            </button>
            <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>
              Einmalig — erkennt Karriere-Wörter aus alten Sessions
            </div>
          </div>
        </>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}
