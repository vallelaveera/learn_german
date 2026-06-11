"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSubTabs } from "@/components/admin/AdminShell";

interface ContentWord {
  id: string;
  german: string;
  english: string;
  level: string;
  source: "placement" | "common" | "career" | "generated";
  category?: string;
  topic?: string;
}

interface ContentSentence {
  id: string;
  german: string;
  english: string;
  level: string;
  source?: "static" | "generated";
  category?: string;
  topic?: string;
}

interface Catalog {
  words: ContentWord[];
  sentences: ContentSentence[];
  counts: {
    words: { total: number; placement: number; common: number; career: number; generated: number; byLevel: Record<string, number> };
    sentences: { total: number; byLevel: Record<string, number> };
  };
}

type Tab = "words" | "sentences";

const LEVELS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

interface AuditSummary {
  provider: string;
  providerLabel: string;
  checked: number;
  flagged: number;
  passed: number;
  findings: { id: string; de: string; en: string; level: string; issues: string[] }[];
}

export default function AdminContentPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("words");
  const [level, setLevel] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [auditAvailable, setAuditAvailable] = useState<boolean | null>(null);
  const [auditProviderLabel, setAuditProviderLabel] = useState<string>("");
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditSummary | null>(null);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    fetch("/api/admin/content")
      .then(r => {
        if (r.status === 401) { router.push("/mode"); return null; }
        return r.json();
      })
      .then(d => { if (d) setCatalog(d); })
      .finally(() => setLoading(false));

    fetch("/api/admin/audit")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) {
          setAuditAvailable(d.available);
          if (d.provider === "gemini") setAuditProviderLabel("Gemini Flash");
          else if (d.provider === "openai") setAuditProviderLabel("GPT-4o mini");
        }
      });
  }, [router]);

  const filteredWords = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.words.filter(w => {
      if (level !== "all" && w.level !== level) return false;
      if (!q) return true;
      return w.german.toLowerCase().includes(q) || w.english.toLowerCase().includes(q) || w.id.includes(q);
    });
  }, [catalog, level, search]);

  const generatedWordCount = catalog?.counts.words.generated ?? 0;

  const runAudit = async (limit: number) => {
    setAuditRunning(true);
    setAuditError("");
    setAuditResult(null);
    try {
      const res = await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit,
          level: level === "all" ? undefined : level,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      setAuditResult(data);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setAuditRunning(false);
    }
  };

  const filteredSentences = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.sentences.filter(s => {
      if (level !== "all" && s.level !== level) return false;
      if (!q) return true;
      return s.german.toLowerCase().includes(q) || s.english.toLowerCase().includes(q) || s.id.includes(q);
    });
  }, [catalog, level, search]);

  return (
    <>
      {loading && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Lädt...</p>}

      {catalog && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Wörter</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--accent)", marginBottom: 6 }}>{catalog.counts.words.total}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.5 }}>
                Placement {catalog.counts.words.placement} · Common {catalog.counts.words.common} · Career {catalog.counts.words.career} · Generated {catalog.counts.words.generated}
              </div>
            </div>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Sätze</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--accent)", marginBottom: 6 }}>{catalog.counts.sentences.total}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: 1.5 }}>
                {Object.entries(catalog.counts.sentences.byLevel).map(([lv, n]) => `${lv} ${n}`).join(" · ")}
              </div>
            </div>
          </div>

          <AdminSubTabs
            tabs={[
              { id: "words", label: "Wörter" },
              { id: "sentences", label: "Sätze" },
            ]}
            active={tab}
            onChange={id => setTab(id as "words" | "sentences")}
          />

          {tab === "words" && generatedWordCount > 0 && (
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Corpus-Audit (generierte Wörter)
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                Zweitmeinung via {auditProviderLabel || "Gemini Flash oder GPT-4o mini"} — ein Wort pro Prüfung, unabhängig von Claude.
                DeepL eignet sich nicht für Artikel/Grammatik.
              </p>
              {auditAvailable === false && (
                <p style={{ fontSize: 12, color: "#92400E", margin: "0 0 12px" }}>
                  GEMINI_API_KEY oder OPENAI_API_KEY in Vercel setzen.
                </p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: auditResult || auditError ? 12 : 0 }}>
                <button
                  type="button"
                  disabled={auditRunning || auditAvailable === false}
                  onClick={() => runAudit(20)}
                  style={{
                    minHeight: 36, padding: "8px 14px", borderRadius: 8, border: "none",
                    background: auditRunning ? "var(--border)" : "#7F77DD", color: "#fff",
                    fontSize: 12, cursor: auditRunning ? "wait" : "pointer", fontFamily: "var(--font-mono)",
                  }}
                >
                  {auditRunning ? "Prüft…" : "Stichprobe (20)"}
                </button>
                <button
                  type="button"
                  disabled={auditRunning || auditAvailable === false}
                  onClick={() => runAudit(Math.min(100, generatedWordCount))}
                  style={{
                    minHeight: 36, padding: "8px 14px", borderRadius: 8,
                    border: "0.5px solid var(--border)", background: "var(--bg)",
                    color: "var(--text)", fontSize: 12,
                    cursor: auditRunning ? "wait" : "pointer", fontFamily: "var(--font-mono)",
                  }}
                >
                  Alle generierten (max. 100)
                </button>
              </div>
              {auditError && (
                <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{auditError}</p>
              )}
              {auditResult && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    {auditResult.providerLabel}: {auditResult.checked} geprüft · {auditResult.passed} ok ·{" "}
                    <span style={{ color: auditResult.flagged > 0 ? "#DC2626" : "var(--accent)" }}>
                      {auditResult.flagged} auffällig
                    </span>
                  </p>
                  {auditResult.findings.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {auditResult.findings.map(f => (
                        <div key={f.id} style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                          <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, margin: "0 0 4px" }}>{f.de}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px", fontStyle: "italic" }}>{f.en} · {f.level}</p>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "#DC2626", lineHeight: 1.45 }}>
                            {f.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {LEVELS.map(lv => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                style={{
                  minHeight: 32, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)",
                  border: level === lv ? "1.5px solid #7F77DD" : "0.5px solid var(--border)",
                  background: level === lv ? "#EEEDFE" : "var(--surface)",
                  color: level === lv ? "#7F77DD" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {lv === "all" ? "Alle" : lv}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === "words" ? "Wort suchen..." : "Satz suchen..."}
              style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 16, fontFamily: "var(--font-mono)", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tab === "words" ? filteredWords.map(w => (
              <div key={w.id} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "#7F77DD", fontFamily: "var(--font-mono)" }}>{w.level}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{w.source} · {w.id}</span>
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--text)", margin: "0 0 4px", lineHeight: 1.35 }}>{w.german}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>{w.english}</p>
                {w.source === "generated" && (w.category || w.topic) && (
                  <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "6px 0 0", fontFamily: "var(--font-mono)" }}>
                    {[w.category, w.topic].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            )) : filteredSentences.map(s => (
              <div key={s.id} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "#7F77DD", fontFamily: "var(--font-mono)" }}>{s.level}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                    {s.source === "generated" ? "generated" : "static"} · {s.id}
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--text)", margin: "0 0 4px", lineHeight: 1.4 }}>{s.german}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>{s.english}</p>
                {s.source === "generated" && (s.category || s.topic) && (
                  <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "6px 0 0", fontFamily: "var(--font-mono)" }}>
                    {[s.category, s.topic].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))}

            {tab === "words" && filteredWords.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>Keine Wörter gefunden.</p>
            )}
            {tab === "sentences" && filteredSentences.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>Keine Sätze gefunden.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
