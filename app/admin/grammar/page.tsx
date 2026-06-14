"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdminCard, AdminStatGrid, AdminSubTabs } from "@/components/admin/AdminShell";
import {
  GrammarGapList,
  GrammarMatrixDashboard,
  type GrammarMatrixBlock,
  type GrammarMatrixCellSelection,
} from "@/components/admin/GrammarMatrixDashboard";
import {
  CATEGORY_LABELS,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { GRAMMAR_EXERCISE_TARGET, TIER_LABELS } from "@/lib/grammar/coverage";
import { AdminProviderSelect, readStoredProvider } from "@/components/admin/AdminProviderSelect";
import type { AdminLlmProvider } from "@/lib/content/llm-provider";

interface CoverageReport {
  meta: { version: number; title: string; generatedAt?: string };
  totals: {
    slots: number;
    exercises: number;
    extraExercises: number;
    theoryPoints: number;
    gaps: number;
  };
  blocks: GrammarMatrixBlock[];
  gaps: GrammarMatrixBlock[];
}

interface BlockDetail {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  theory: string[];
  theoryOther: string[];
  typicalMistakes: string[];
  exercises: string[];
  baseCount: number;
  extraCount: number;
  appCoverage: { status: string; trainerId?: string; curriculumIds?: string[]; notes?: string };
}

interface PreviewResult {
  passed: string[];
  rejected: { spec: string; issues: string[] }[];
  generated: number;
  requested: number;
  provider?: AdminLlmProvider;
  providerLabel?: string;
}

interface ProviderOption {
  id: AdminLlmProvider;
  label: string;
}

type PageTab = "generate" | "coverage";

const PAGE_TABS = [
  { id: "generate" as const, label: "Generieren" },
  { id: "coverage" as const, label: "Abdeckung" },
];

function AdminGrammarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageTab, setPageTab] = useState<PageTab>("coverage");
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [detail, setDetail] = useState<BlockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selected, setSelected] = useState<{
    level: VerifiedLevel;
    category: GrammarCategory;
    tier: GrammarTier;
  } | null>(null);
  const [prefillHint, setPrefillHint] = useState<string | null>(null);
  const [genCount, setGenCount] = useState(5);
  const [provider, setProvider] = useState<AdminLlmProvider>(() => readStoredProvider());
  const [providers, setProviders] = useState<ProviderOption[]>([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/grammar", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/mode");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReport(data.report);
      if (data.providers?.length) {
        setProviders(data.providers);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadBlock = useCallback(
    async (level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier) => {
      setError("");
      setPreview(null);
      setSelected({ level, category, tier });
      try {
        const res = await fetch(
          `/api/admin/grammar?level=${level}&category=${category}&tier=${tier}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setDetail(data.block);
        if (data.providers?.length) setProviders(data.providers);
        if (data.defaultProvider) setProvider(prev =>
          data.providers.some((p: ProviderOption) => p.id === prev) ? prev : data.defaultProvider,
        );
      } catch (e) {
        setError(String(e));
      }
    },
    [],
  );

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "generate" || tab === "coverage") {
      setPageTab(tab);
    }

    const level = searchParams.get("level") as VerifiedLevel | null;
    const category = searchParams.get("category") as GrammarCategory | null;
    const tier = (searchParams.get("tier") === "advanced" ? "advanced" : "basic") as GrammarTier;
    if (level && category) {
      void loadBlock(level, category, tier);
      setPrefillHint(`${level} · ${CATEGORY_LABELS[category]} · ${TIER_LABELS[tier]}`);
      if (tab !== "coverage") setPageTab("generate");
    }
  }, [searchParams, loadBlock]);

  const selectCell = (cell: GrammarMatrixCellSelection) => {
    setPageTab("generate");
    setPrefillHint(`${cell.level} · ${cell.label} · ${TIER_LABELS[cell.tier]}`);
    router.replace(`/admin/grammar?tab=generate&level=${cell.level}&category=${cell.category}&tier=${cell.tier}`);
    void loadBlock(cell.level, cell.category, cell.tier);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectBlock = (level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier) => {
    selectCell({
      level,
      category,
      tier,
      label: CATEGORY_LABELS[category],
      count: 0,
      needsExercises: GRAMMAR_EXERCISE_TARGET,
    });
  };

  const runPreview = async () => {
    if (!selected) return;
    setGenerating(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch("/api/admin/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          level: selected.level,
          category: selected.category,
          tier: selected.tier,
          count: genCount,
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preview fehlgeschlagen");
      setPreview(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const savePreview = async () => {
    if (!selected || !preview?.passed.length) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          level: selected.level,
          category: selected.category,
          tier: selected.tier,
          exercises: preview.passed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      setPreview(null);
      await loadReport();
      await loadBlock(selected.level, selected.category, selected.tier);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelected(null);
    setDetail(null);
    setPreview(null);
    setPrefillHint(null);
    router.replace(`/admin/grammar?tab=${pageTab}`);
  };

  return (
    <>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
        Matrix unter <strong>Abdeckung</strong> — Zelle antippen, dann hier <strong>Generieren</strong>.
      </p>

      <AdminSubTabs
        tabs={PAGE_TABS}
        active={pageTab}
        onChange={id => {
          const next = id as PageTab;
          setPageTab(next);
          router.replace(`/admin/grammar?tab=${next}`, { scroll: false });
        }}
      />

      {loading && pageTab === "coverage" && (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Lädt…</p>
      )}
      {error && (
        <AdminCard style={{ marginBottom: 16, borderColor: "#FECACA" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#991B1B" }}>{error}</p>
        </AdminCard>
      )}

      {pageTab === "coverage" && report && (
        <>
          <AdminStatGrid
            stats={[
              { label: "Slots (4×2×5)", value: report.totals.slots },
              { label: "Übungen (Basis)", value: report.totals.exercises },
              { label: "Angereichert (KV)", value: report.totals.extraExercises, accent: "#0e7490" },
              { label: "Lücken", value: report.totals.gaps, accent: report.totals.gaps ? "#991B1B" : "#065F46" },
            ]}
          />

          <AdminCard style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Abdeckungs-Matrix</h2>
            <GrammarMatrixDashboard blocks={report.blocks} onCellClick={selectCell} />
          </AdminCard>

          <AdminCard style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>
              Lücken (unter {GRAMMAR_EXERCISE_TARGET} Übungen pro Slot)
            </h2>
            <GrammarGapList gaps={report.gaps} onSelect={selectCell} />
          </AdminCard>
        </>
      )}

      {pageTab === "generate" && (
        <>
          {prefillHint && !detail && (
            <AdminCard style={{ background: "#EEEDFE", borderColor: "#C4B5FD", padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#5B21B6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Vorausgefüllt aus Matrix
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#7F77DD", fontFamily: "var(--font-mono)" }}>
                {prefillHint}
              </div>
            </AdminCard>
          )}

          {!detail && !selected && (
            <>
              <AdminCard style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
                  Wähle eine Zelle in der <strong>Abdeckung</strong>-Matrix — oder tippe unten auf eine Lücke.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPageTab("coverage");
                    router.replace("/admin/grammar?tab=coverage", { scroll: false });
                  }}
                  style={{
                    fontSize: 12,
                    color: "#7F77DD",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    padding: 0,
                  }}
                >
                  Zur Matrix →
                </button>
                {report && report.gaps.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: "0.5px solid var(--border)", paddingTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 8px", color: "var(--text-muted)" }}>
                      Schnellstart — größte Lücken
                    </p>
                    <GrammarGapList gaps={report.gaps.slice(0, 8)} onSelect={selectCell} />
                  </div>
                )}
              </AdminCard>

              <AdminCard style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7F77DD", margin: "0 0 8px" }}>
                  Anreicherungs-Prompt
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)" }}>
                  <li>Mehr <strong>Satz-Vielfalt</strong> — verschiedene Verben, Kontexte, Satzmuster</li>
                  <li>Nur Theorie der gewählten Stufe (Basic oder Advanced), nie beides vermischen</li>
                  <li>Keine erfundenen Regeln — nur Goethe / telc / Lehrbuch-Muster</li>
                  <li>Claude oder GPT-4o — Provider wählen zum Vergleich</li>
                </ul>
              </AdminCard>
            </>
          )}

          {detail && selected && (
            <AdminCard style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                    {selected.level} · {CATEGORY_LABELS[selected.category]} · {TIER_LABELS[selected.tier]}
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    {detail.baseCount} Basis + {detail.extraCount} KV = {detail.exercises.length} Übungen
                    {detail.exercises.length < GRAMMAR_EXERCISE_TARGET
                      ? ` · noch ${GRAMMAR_EXERCISE_TARGET - detail.exercises.length} bis Ziel`
                      : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["basic", "advanced"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectBlock(selected.level, selected.category, t)}
                      style={{
                        fontSize: 11,
                        borderRadius: 8,
                        padding: "6px 10px",
                        border: "0.5px solid var(--border)",
                        background: selected.tier === t ? "#7F77DD" : "var(--bg)",
                        color: selected.tier === t ? "#fff" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {TIER_LABELS[t]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearSelection}
                    style={{ fontSize: 11, border: "0.5px solid var(--border)", borderRadius: 8, padding: "6px 10px", background: "var(--bg)", cursor: "pointer" }}
                  >
                    Schließen
                  </button>
                </div>
              </div>

              <div style={{
                background: "#EEEDFE",
                border: "0.5px solid #C4B5FD",
                borderRadius: 12,
                padding: "14px",
                marginBottom: 14,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 10px", color: "#5B21B6" }}>
                  Satz-Übungen generieren
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <AdminProviderSelect
                    value={provider}
                    onChange={setProvider}
                    providers={providers.length ? providers : [{ id: "claude", label: "Claude Haiku 4.5" }]}
                    disabled={generating}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      Anzahl
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={genCount}
                        onChange={e => setGenCount(Number(e.target.value))}
                        style={{ width: 56, padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--border)", fontSize: 14 }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void runPreview()}
                      disabled={generating}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        minWidth: 160,
                        padding: "0 20px",
                        borderRadius: 10,
                        border: "none",
                        background: "#7F77DD",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: generating ? "wait" : "pointer",
                        opacity: generating ? 0.7 : 1,
                      }}
                    >
                      {generating ? "Generiert…" : "Vorschau generieren"}
                    </button>
                  </div>
                </div>
              </div>

              {preview && (
                <div style={{ marginBottom: 14, padding: "12px 14px", background: "var(--bg)", borderRadius: 10, border: "0.5px solid var(--border)" }}>
                  <p style={{ fontSize: 12, margin: "0 0 8px" }}>
                    {preview.passed.length} gültig · {preview.rejected.length} abgelehnt (von {preview.generated})
                    {preview.providerLabel ? ` · ${preview.providerLabel}` : ""}
                  </p>
                  {preview.passed.length > 0 && (
                    <>
                      <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 10, fontFamily: "var(--font-mono)", lineHeight: 1.45 }}>
                        {preview.passed.map((ex, i) => (
                          <li key={i} style={{ marginBottom: 4, wordBreak: "break-word" }}>{ex}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => void savePreview()}
                        disabled={saving}
                        style={{
                          width: "100%",
                          minHeight: 48,
                          padding: "0 16px",
                          borderRadius: 10,
                          border: "none",
                          background: "#065F46",
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: saving ? "wait" : "pointer",
                        }}
                      >
                        {saving ? "Speichert…" : `${preview.passed.length} Übungen speichern`}
                      </button>
                    </>
                  )}
                  {preview.rejected.length > 0 && (
                    <details style={{ marginTop: 12 }}>
                      <summary style={{ fontSize: 11, cursor: "pointer", color: "var(--text-muted)" }}>
                        Abgelehnte ({preview.rejected.length})
                      </summary>
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 10, lineHeight: 1.45 }}>
                        {preview.rejected.map((r, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            <span style={{ fontFamily: "var(--font-mono)" }}>{r.spec}</span>
                            <br />
                            <span style={{ color: "#991B1B" }}>{r.issues.join("; ")}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <details style={{ marginBottom: 10 }}>
                <summary style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text)", padding: "4px 0" }}>
                  Theorie {TIER_LABELS[selected.tier]} ({detail.theory.length})
                </summary>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11, lineHeight: 1.5, color: "var(--text)" }}>
                  {detail.theory.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </details>

              <details style={{ marginBottom: 10 }}>
                <summary style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--text-muted)", padding: "4px 0" }}>
                  Übungen vorhanden ({detail.exercises.length})
                </summary>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 10, lineHeight: 1.45, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {detail.exercises.length ? (
                    detail.exercises.map((ex, i) => (
                      <li key={i} style={{ marginBottom: 4, wordBreak: "break-word" }}>{ex}</li>
                    ))
                  ) : (
                    <li>Noch keine — ideal für Anreicherung</li>
                  )}
                </ul>
              </details>

              <details>
                <summary style={{ fontSize: 11, cursor: "pointer", color: "var(--text-dim)", padding: "4px 0" }}>
                  Prompt-Regeln
                </summary>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11, lineHeight: 1.5, color: "var(--text-muted)" }}>
                  <li>Nur Theorie dieser Stufe · Goethe/telc/Lehrbuch · keine Duplikate</li>
                  <li>{TIER_LABELS[selected.tier === "basic" ? "advanced" : "basic"]} nicht verwenden</li>
                </ul>
              </details>
            </AdminCard>
          )}
        </>
      )}
    </>
  );
}

export default function AdminGrammarPage() {
  return (
    <Suspense fallback={<p style={{ fontSize: 12, color: "var(--text-muted)" }}>Lädt…</p>}>
      <AdminGrammarPageInner />
    </Suspense>
  );
}
