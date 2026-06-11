"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CUSTOM_TOPIC_VALUE } from "@/lib/content/taxonomy-types";

interface TopicOption {
  id: string;
  label: string;
}

interface CategoryOption {
  id: string;
  labelDe: string;
  labelEn?: string;
  topics: TopicOption[];
}

interface TaxonomyCategoryFull {
  id: string;
  labelDe: string;
  labelEn?: string;
  active: boolean;
  topics: { id: string; label: string; active: boolean }[];
}

interface PipelineSummary {
  requested: number;
  generated: number;
  passed: number;
  rejected: number;
  rejectionRate: string;
  savedIds: string[];
  rejectedLog: { de: string; issues: string[] }[];
  type?: "words" | "sentences";
}

interface CoverageGap {
  category: string;
  labelDe?: string;
  words: number;
  sentences: number;
  total: number;
  needsWords: number;
  needsSentences: number;
}

interface CategoryCoverage {
  category: string;
  labelDe?: string;
  words: number;
  sentences: number;
  total: number;
}

interface CoverageReport {
  totals: { words: number; sentences: number };
  targets: { words: number; sentences: number };
  categories: CategoryCoverage[];
  gaps: CoverageGap[];
}

type GenerateType = "words" | "sentences";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function categoryLabel(c: { id?: string; category?: string; labelDe?: string }) {
  return c.labelDe ?? c.id ?? c.category ?? "?";
}

export default function AdminGeneratePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [taxonomyFull, setTaxonomyFull] = useState<TaxonomyCategoryFull[]>([]);
  const [showTaxonomy, setShowTaxonomy] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [genType, setGenType] = useState<GenerateType>("sentences");
  const [level, setLevel] = useState<string>("B1");
  const [category, setCategory] = useState<string>("career");
  const [topicMode, setTopicMode] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [count, setCount] = useState(20);
  const [running, setRunning] = useState(false);
  const [taxonomyBusy, setTaxonomyBusy] = useState(false);
  const [error, setError] = useState("");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [result, setResult] = useState<PipelineSummary | null>(null);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [showAllCoverage, setShowAllCoverage] = useState(false);
  const [newCatId, setNewCatId] = useState("");
  const [newCatLabelDe, setNewCatLabelDe] = useState("");
  const [newTopicLabel, setNewTopicLabel] = useState("");

  function loadTaxonomyFull() {
    return fetch("/api/admin/taxonomy")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.categories) setTaxonomyFull(d.categories); });
  }

  function loadMeta() {
    return Promise.all([
      fetch("/api/admin/generate")
        .then(r => {
          if (r.status === 401) { router.push("/mode"); return null; }
          return r.json();
        })
        .then(d => {
          if (!d) return;
          if (d.categories?.length) {
            setCategories(d.categories);
            setCategory(prev =>
              d.categories.some((c: CategoryOption) => c.id === prev) ? prev : d.categories[0].id,
            );
          }
          if (d.coverage) setCoverage(d.coverage);
        }),
      loadTaxonomyFull(),
    ]);
  }

  useEffect(() => {
    loadMeta()
      .catch(e => setError(String(e)))
      .finally(() => setLoadingTopics(false));
  }, [router]);

  function applyGap(gap: CoverageGap) {
    setCategory(gap.category);
    setGenType(gap.needsWords >= gap.needsSentences ? "words" : "sentences");
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const topics = useMemo(
    () => categories.find(c => c.id === category)?.topics ?? [],
    [categories, category]
  );

  useEffect(() => {
    setTopicMode("");
    setCustomTopic("");
    setResult(null);
  }, [category, genType]);

  const resolvedTopic = useMemo(() => {
    if (!topicMode) return undefined;
    if (topicMode === CUSTOM_TOPIC_VALUE) return customTopic.trim() || undefined;
    return topics.find(t => t.id === topicMode)?.label;
  }, [topicMode, customTopic, topics]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setTaxonomyBusy(true);
    setTaxonomyError("");
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newCatId.trim() || undefined,
          labelDe: newCatLabelDe.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNewCatId("");
      setNewCatLabelDe("");
      await loadMeta();
    } catch (e) {
      setTaxonomyError(e instanceof Error ? e.message : String(e));
    } finally {
      setTaxonomyBusy(false);
    }
  }

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !newTopicLabel.trim()) return;
    setTaxonomyBusy(true);
    setTaxonomyError("");
    try {
      const res = await fetch(`/api/admin/taxonomy/categories/${category}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newTopicLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNewTopicLabel("");
      await loadMeta();
    } catch (e) {
      setTaxonomyError(e instanceof Error ? e.message : String(e));
    } finally {
      setTaxonomyBusy(false);
    }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!category) return;
    setTaxonomyBusy(true);
    setTaxonomyError("");
    try {
      const res = await fetch(`/api/admin/taxonomy/categories/${category}/topics/${topicId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      await loadMeta();
    } catch (e) {
      setTaxonomyError(e instanceof Error ? e.message : String(e));
    } finally {
      setTaxonomyBusy(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    setTaxonomyBusy(true);
    setTaxonomyError("");
    try {
      const res = await fetch(`/api/admin/taxonomy/categories/${categoryId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      await loadMeta();
    } catch (e) {
      setTaxonomyError(e instanceof Error ? e.message : String(e));
    } finally {
      setTaxonomyBusy(false);
    }
  }

  async function handleGenerate() {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: genType,
          level,
          category,
          topic: resolvedTopic,
          count,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      setResult(data);
      await loadMeta();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  const highRejection =
    result && result.generated > 0 && result.rejected / result.generated > 0.3;

  const isWords = genType === "words";

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--red)", color: "white", padding: "2px 6px", borderRadius: 3 }}>ADMIN</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 300 }}>Inhalt generieren</span>
        </div>
        <Link href="/admin" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Nutzer</Link>
      </header>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {coverage && (
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Corpus-Abdeckung (generiert)
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                {coverage.totals.words} W · {coverage.totals.sentences} S
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "0 0 10px", lineHeight: 1.45 }}>
              Ziel: min. {coverage.targets.words} Wörter & {coverage.targets.sentences} Sätze pro Kategorie. Klicke eine Lücke, um sie vorauszufüllen.
            </p>

            {coverage.gaps.length === 0 ? (
              <p style={{ fontSize: 12, color: "#059669", margin: 0 }}>Alle Kategorien erreichen das Mindestziel.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(showAllCoverage ? coverage.gaps : coverage.gaps.slice(0, 5)).map(gap => (
                  <button
                    key={gap.category}
                    type="button"
                    onClick={() => applyGap(gap)}
                    disabled={running}
                    style={{
                      textAlign: "left",
                      background: "#FEF3C7",
                      border: "0.5px solid #FDE68A",
                      borderRadius: 8,
                      padding: "10px 12px",
                      cursor: running ? "not-allowed" : "pointer",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#92400E", marginBottom: 2 }}>
                      {categoryLabel(gap)}
                    </div>
                    <div style={{ fontSize: 11, color: "#B45309", fontFamily: "var(--font-mono)" }}>
                      {gap.words}/{coverage.targets.words} Wörter · {gap.sentences}/{coverage.targets.sentences} Sätze
                      {(gap.needsWords > 0 || gap.needsSentences > 0) && (
                        <span> — fehlen ~{gap.needsWords} W, ~{gap.needsSentences} S</span>
                      )}
                    </div>
                  </button>
                ))}
                {coverage.gaps.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCoverage(v => !v)}
                    style={{ fontSize: 11, color: "#7F77DD", background: "none", border: "none", cursor: "pointer", padding: 4, fontFamily: "var(--font-mono)" }}
                  >
                    {showAllCoverage ? "Weniger anzeigen" : `Alle ${coverage.gaps.length} Lücken anzeigen`}
                  </button>
                )}
              </div>
            )}

            {showAllCoverage && (
              <div style={{ marginTop: 12, borderTop: "0.5px solid var(--border)", paddingTop: 10 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Alle Kategorien</div>
                {coverage.categories.map(row => (
                  <div key={row.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)", padding: "3px 0" }}>
                    <span>{categoryLabel(row)}</span>
                    <span>{row.words} W · {row.sentences} S</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
          <button
            type="button"
            onClick={() => setShowTaxonomy(v => !v)}
            style={{
              width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em",
              fontFamily: "var(--font-mono)", padding: 0,
            }}
          >
            {showTaxonomy ? "▼" : "▶"} Kategorien & Themen verwalten
          </button>

          {showTaxonomy && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <form onSubmit={handleAddCategory} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Neue Kategorie</div>
                <input
                  value={newCatId}
                  onChange={e => setNewCatId(e.target.value)}
                  placeholder="id (optional, z.B. education)"
                  disabled={taxonomyBusy}
                  style={{ padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--border)", background: "var(--bg)", fontSize: 13, fontFamily: "var(--font-mono)" }}
                />
                <input
                  value={newCatLabelDe}
                  onChange={e => setNewCatLabelDe(e.target.value)}
                  placeholder="Label DE (z.B. Bildung)"
                  disabled={taxonomyBusy}
                  style={{ padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--border)", background: "var(--bg)", fontSize: 13 }}
                />
                <button
                  type="submit"
                  disabled={taxonomyBusy || !newCatLabelDe.trim()}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#7F77DD", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-mono)" }}
                >
                  Kategorie hinzufügen
                </button>
              </form>

              <form onSubmit={handleAddTopic} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Neues Thema in «{categoryLabel(categories.find(c => c.id === category) ?? { id: category })}»
                </div>
                <input
                  value={newTopicLabel}
                  onChange={e => setNewTopicLabel(e.target.value)}
                  placeholder="Thema EN (z.B. homework help)"
                  disabled={taxonomyBusy}
                  style={{ padding: "8px 10px", borderRadius: 6, border: "0.5px solid var(--border)", background: "var(--bg)", fontSize: 13, fontFamily: "var(--font-mono)" }}
                />
                <button
                  type="submit"
                  disabled={taxonomyBusy || !newTopicLabel.trim()}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#7F77DD", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-mono)" }}
                >
                  Thema hinzufügen
                </button>
              </form>

              {taxonomyError && (
                <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{taxonomyError}</p>
              )}

              <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 10 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Alle Kategorien</div>
                {taxonomyFull.map(cat => (
                  <div key={cat.id} style={{ marginBottom: 10, opacity: cat.active ? 1 : 0.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", textDecoration: cat.active ? "none" : "line-through" }}>
                        {cat.labelDe} <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>({cat.id})</span>
                      </span>
                      {cat.active && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          disabled={taxonomyBusy}
                          style={{ fontSize: 10, color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                        >
                          deaktivieren
                        </button>
                      )}
                    </div>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
                      {cat.topics.filter(t => t.active).map(t => (
                        <li key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span>{t.label}</span>
                          {cat.id === category && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTopic(t.id)}
                              disabled={taxonomyBusy}
                              style={{ fontSize: 10, color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}
                            >
                              ×
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(["sentences", "words"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setGenType(t)}
              disabled={running}
              style={{
                flex: 1, minHeight: 44, borderRadius: 8, fontSize: 13, fontFamily: "var(--font-mono)",
                border: "0.5px solid var(--border)",
                background: genType === t ? "#7F77DD" : "var(--surface)",
                color: genType === t ? "#fff" : "var(--text-muted)",
                cursor: running ? "not-allowed" : "pointer",
              }}
            >
              {t === "sentences" ? "Sätze" : "Wörter"}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {isWords
            ? "Vokabelkarten mit 2 falschen englischen Optionen. Max. 3 deutsche Wörter pro Eintrag."
            : "Übungssätze mit Übersetzung. Max. 10 Wörter pro Satz (5–8 ideal)."}
        </p>

        {loadingTopics && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Lädt Kategorien...</p>}

        {!loadingTopics && (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Level</span>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                disabled={running}
                style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-mono)" }}
              >
                {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Kategorie</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={running}
                style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-mono)" }}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{categoryLabel(c)}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Thema (optional)</span>
              <select
                value={topicMode}
                onChange={e => setTopicMode(e.target.value)}
                disabled={running}
                style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-mono)" }}
              >
                <option value="">— kein Thema —</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                <option value={CUSTOM_TOPIC_VALUE}>— Freitext —</option>
              </select>
              {topicMode === CUSTOM_TOPIC_VALUE && (
                <input
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="Eigenes Thema (EN, z.B. visa application)"
                  disabled={running}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-mono)" }}
                />
              )}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Anzahl ({count})</span>
              <input
                type="range"
                min={1}
                max={50}
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                disabled={running}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>1–50 · Standard 20</span>
            </label>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={running}
              style={{
                minHeight: 48,
                borderRadius: 10,
                border: "none",
                background: running ? "var(--border)" : "#7F77DD",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: running ? "not-allowed" : "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              {running
                ? "Generiert & prüft… (ca. 15–30 s)"
                : isWords ? "Wörter generieren" : "Sätze generieren"}
            </button>
          </>
        )}

        {error && (
          <div style={{ background: "#FEE2E2", border: "0.5px solid #FECACA", borderRadius: 10, padding: 12, fontSize: 13, color: "#991B1B" }}>
            {error}
          </div>
        )}

        {result && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Angefordert", value: result.requested },
                { label: "Generiert", value: result.generated },
                { label: "Bestanden", value: result.passed },
                { label: "Abgelehnt", value: result.rejected },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Ablehnungsrate</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: highRejection ? "#DC2626" : "var(--accent)" }}>{result.rejectionRate}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                {result.savedIds.length} neue IDs gespeichert
                {result.rejected > 0 && " · Abgelehnte werden nicht gespeichert (nur hier + Server-Log)"}
              </div>
            </div>

            {result.rejected > 0 && (
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: 12, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Abgelehnte Einträge werden verworfen — sie landen weder in Redis noch in Übungen. Du siehst sie hier zur Kontrolle; danach sind sie weg, außer im Vercel-Log.
              </div>
            )}

            {highRejection && (
              <div style={{ background: "#FEF3C7", border: "0.5px solid #FDE68A", borderRadius: 10, padding: 12, fontSize: 12, color: "#92400E" }}>
                Hohe Ablehnungsrate — Prompt prüfen oder Anzahl senken.
              </div>
            )}

            {result.rejectedLog.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Abgelehnt ({isWords ? "Wörter" : "Sätze"})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.rejectedLog.map((r, i) => (
                    <div key={i} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--text)", margin: "0 0 6px", lineHeight: 1.4 }}>{r.de}</p>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#DC2626", lineHeight: 1.5 }}>
                        {r.issues.map((issue, j) => <li key={j}>{issue}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link href="/admin/content" style={{ textDecoration: "none" }}>
              <div style={{ background: "#EEEDFE", border: "0.5px solid #C4B5FD", borderRadius: 10, padding: "14px 16px", textAlign: "center", fontSize: 13, color: "#7F77DD", fontWeight: 500 }}>
                Gespeicherte {isWords ? "Wörter" : "Sätze"} in Übungsinhalt ansehen →
              </div>
            </Link>
          </>
        )}
      </div>
      <div style={{ height: 32 }} />
    </div>
  );
}
