"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdminCard, AdminShell, AdminStatGrid } from "@/components/admin/AdminShell";
import {
  GrammarGapList,
  GrammarMatrixDashboard,
  type GrammarMatrixBlock,
} from "@/components/admin/GrammarMatrixDashboard";
import {
  CATEGORY_LABELS,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { GRAMMAR_EXERCISE_TARGET, TIER_LABELS } from "@/lib/grammar/coverage";

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
}

function AdminGrammarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [genCount, setGenCount] = useState(5);

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
    const level = searchParams.get("level") as VerifiedLevel | null;
    const category = searchParams.get("category") as GrammarCategory | null;
    const tier = (searchParams.get("tier") === "advanced" ? "advanced" : "basic") as GrammarTier;
    if (level && category) {
      void loadBlock(level, category, tier);
    }
  }, [searchParams, loadBlock]);

  const selectBlock = (level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier) => {
    router.replace(`/admin/grammar?level=${level}&category=${category}&tier=${tier}`);
    void loadBlock(level, category, tier);
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

  return (
    <AdminShell title="Grammatik">
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
        4 Bereiche × 2 Stufen (Basic / Advanced) = 8 Übungsslots pro Level. Theorie bleibt stabil — hier reichst du
        <strong> Satz-Übungen mit mehr Vielfalt</strong> an. Claude nutzt nur die Theorie der gewählten Stufe.
      </p>

      {report && (
        <AdminStatGrid
          stats={[
            { label: "Slots (4×2×5)", value: report.totals.slots },
            { label: "Übungen (Basis)", value: report.totals.exercises },
            { label: "Angereichert (KV)", value: report.totals.extraExercises, accent: "#0e7490" },
            { label: "Lücken", value: report.totals.gaps, accent: report.totals.gaps ? "#991B1B" : "#065F46" },
          ]}
        />
      )}

      <AdminCard style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7F77DD", margin: "0 0 8px" }}>
          Anreicherungs-Prompt
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)" }}>
          <li>Mehr <strong>Satz-Vielfalt</strong> — verschiedene Verben, Kontexte, Satzmuster</li>
          <li>Nur Theorie der gewählten Stufe (Basic oder Advanced), nie beides vermischen</li>
          <li>Keine erfundenen Regeln — nur CEFR / Goethe / Lehrbuch-Muster</li>
          <li>Doppelte Satzstämme werden automatisch abgelehnt</li>
        </ul>
      </AdminCard>

      {loading && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Lädt…</p>}
      {error && (
        <AdminCard style={{ marginBottom: 16, borderColor: "#FECACA" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#991B1B" }}>{error}</p>
        </AdminCard>
      )}

      {report && (
        <>
          <AdminCard style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Abdeckungs-Matrix</h2>
            <GrammarMatrixDashboard blocks={report.blocks} onCellClick={selectBlock} />
          </AdminCard>

          <AdminCard style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>
              Lücken (unter {GRAMMAR_EXERCISE_TARGET} Übungen pro Slot)
            </h2>
            <GrammarGapList gaps={report.gaps} onSelect={selectBlock} />
          </AdminCard>
        </>
      )}

      {detail && selected && (
        <AdminCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                {selected.level} · {CATEGORY_LABELS[selected.category]} · {TIER_LABELS[selected.tier]}
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                {detail.baseCount} Basis + {detail.extraCount} angereichert = {detail.exercises.length} Übungen
              </p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
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
                onClick={() => {
                  setSelected(null);
                  setDetail(null);
                  setPreview(null);
                  router.replace("/admin/grammar");
                }}
                style={{ fontSize: 11, border: "0.5px solid var(--border)", borderRadius: 8, padding: "6px 10px", background: "var(--bg)", cursor: "pointer" }}
              >
                Schließen
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 6px", color: "#065F46" }}>
                Theorie {TIER_LABELS[selected.tier]} ({detail.theory.length}) — Quelle für neue Übungen
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.5, color: "var(--text)" }}>
                {detail.theory.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 6px", color: "var(--text-dim)" }}>
                {TIER_LABELS[selected.tier === "basic" ? "advanced" : "basic"]} — nicht in Übungen verwenden
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.5, color: "var(--text-muted)" }}>
                {detail.theoryOther.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
            <section>
              <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 6px" }}>
                Übungen {TIER_LABELS[selected.tier]} ({detail.exercises.length})
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 10, lineHeight: 1.45, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                {detail.exercises.length ? (
                  detail.exercises.map((ex, i) => (
                    <li key={i} style={{ marginBottom: 4, wordBreak: "break-word" }}>{ex}</li>
                  ))
                ) : (
                  <li>Noch keine Übungen — idealer Kandidat für Anreicherung</li>
                )}
              </ul>
            </section>
          </div>

          <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>
              Satz-Übungen generieren ({TIER_LABELS[selected.tier]})
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 10px" }}>
              Claude erstellt neue Lückentexte, Satzbau- und Auswahlaufgaben — jeder Satz unterschiedlich.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                Anzahl
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={genCount}
                  onChange={e => setGenCount(Number(e.target.value))}
                  style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: "0.5px solid var(--border)" }}
                />
              </label>
              <button
                type="button"
                onClick={() => void runPreview()}
                disabled={generating}
                style={{
                  minHeight: 40,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#7F77DD",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: generating ? "wait" : "pointer",
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? "Generiert…" : "Vorschau generieren"}
              </button>
            </div>

            {preview && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, margin: "0 0 8px" }}>
                  {preview.passed.length} gültig · {preview.rejected.length} abgelehnt (von {preview.generated} generiert)
                </p>
                {preview.passed.length > 0 && (
                  <>
                    <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 10, fontFamily: "var(--font-mono)", lineHeight: 1.45 }}>
                      {preview.passed.map((ex, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>{ex}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => void savePreview()}
                      disabled={saving}
                      style={{
                        minHeight: 40,
                        padding: "0 16px",
                        borderRadius: 8,
                        border: "none",
                        background: "#065F46",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: saving ? "wait" : "pointer",
                      }}
                    >
                      {saving ? "Speichert…" : `${preview.passed.length} Übungen freigeben & speichern`}
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
          </div>
        </AdminCard>
      )}
    </AdminShell>
  );
}

export default function AdminGrammarPage() {
  return (
    <Suspense fallback={<AdminShell title="Grammatik"><p style={{ fontSize: 12 }}>Lädt…</p></AdminShell>}>
      <AdminGrammarPageInner />
    </Suspense>
  );
}
