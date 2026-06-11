"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CategoryOption {
  id: string;
  topics: string[];
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

type GenerateType = "words" | "sentences";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

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

export default function AdminGeneratePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [genType, setGenType] = useState<GenerateType>("sentences");
  const [level, setLevel] = useState<string>("B1");
  const [category, setCategory] = useState<string>("career");
  const [topic, setTopic] = useState<string>("");
  const [count, setCount] = useState(20);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PipelineSummary | null>(null);

  useEffect(() => {
    fetch("/api/admin/generate")
      .then(r => {
        if (r.status === 401) { router.push("/mode"); return null; }
        return r.json();
      })
      .then(d => {
        if (!d?.categories) return;
        setCategories(d.categories);
        if (d.categories[0]?.id) setCategory(d.categories[0].id);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoadingTopics(false));
  }, [router]);

  const topics = useMemo(
    () => categories.find(c => c.id === category)?.topics ?? [],
    [categories, category]
  );

  useEffect(() => {
    setTopic("");
    setResult(null);
  }, [category, genType]);

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
          topic: topic || undefined,
          count,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      setResult(data);
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
            : "Übungssätze mit Übersetzung. Max. 8 Wörter pro Satz."}
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
                  <option key={c.id} value={c.id}>{CATEGORY_LABELS[c.id] ?? c.id}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Thema (optional)</span>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                disabled={running}
                style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-mono)" }}
              >
                <option value="">— kein Thema —</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{result.savedIds.length} neue IDs gespeichert</div>
            </div>

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
