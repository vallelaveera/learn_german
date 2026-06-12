"use client";

import { useCallback, useEffect, useState } from "react";

const DEMO_CORRECTIONS = [
  {
    wrong: "der Bus fahrt alle 20 Minuten",
    correct: "der Bus fährt alle 20 Minuten",
    rule: "fahren → fährt (Umlaut in er/sie/es form)",
    translation: "The bus runs every 20 minutes",
  },
  {
    wrong: "Ich bin hier seit drei Jahr",
    correct: "Ich bin hier seit drei Jahren",
    rule: "Jahr → Jahren (Dativ plural after seit)",
    translation: "I have been here for three years",
  },
  {
    wrong: "Sie hat mich angeruf",
    correct: "Sie hat mich angerufen",
    rule: "anrufen → angerufen (Partizip II with ge-)",
    translation: "She called me",
  },
  {
    wrong: "Ich möchte ein Kaffee",
    correct: "Ich möchte einen Kaffee",
    rule: "ein → einen (Akkusativ maskulin)",
    translation: "I would like a coffee",
  },
  {
    wrong: "Er geht zu die Schule",
    correct: "Er geht zur Schule",
    rule: "zu + der → zur (Dativ contraction)",
    translation: "He goes to school",
  },
] as const;

export function GrammarCorrectionDemo() {
  const [index, setIndex] = useState(0);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = DEMO_CORRECTIONS[index];

  const fetchAnimation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSvg(null);

    try {
      const res = await fetch("/api/demo/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setSvg(data.svg);
      setCached(Boolean(data.cached));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [current]);

  useEffect(() => {
    void fetchAnimation();
  }, [fetchAnimation]);

  const goPrev = () => setIndex(i => (i === 0 ? DEMO_CORRECTIONS.length - 1 : i - 1));
  const goNext = () => setIndex(i => (i === DEMO_CORRECTIONS.length - 1 ? 0 : i + 1));

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 400,
        margin: "0 auto 24px",
        padding: "16px",
        background: "var(--surface)",
        border: "1px dashed var(--border)",
        borderRadius: 12,
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 8,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}>
          Dev demo · Grammar animation
        </span>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
          {index + 1} / {DEMO_CORRECTIONS.length}
        </span>
      </div>

      <div style={{
        width: "100%",
        minHeight: 120,
        borderRadius: 8,
        overflow: "hidden",
        background: "#F1EFE8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      }}>
        {loading && (
          <div style={{
            padding: 24,
            fontSize: 12,
            color: "var(--text-muted)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}>
            Generating animation…
          </div>
        )}
        {!loading && error && (
          <p style={{ padding: 16, fontSize: 12, color: "var(--red)", textAlign: "center" }}>
            {error}
          </p>
        )}
        {!loading && svg && !error && (
          <div
            style={{ width: "100%", lineHeight: 0 }}
            dangerouslySetInnerHTML={{ __html: svg }}
            aria-hidden="true"
          />
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 4px", lineHeight: 1.5 }}>
        {current.translation}
      </p>
      <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "0 0 12px", lineHeight: 1.4 }}>
        {current.rule}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button
          type="button"
          onClick={goPrev}
          style={{
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          ← Prev
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {cached && (
            <span style={{ fontSize: 10, color: "var(--green)" }}>cached</span>
          )}
          <button
            type="button"
            onClick={() => void fetchAnimation()}
            disabled={loading}
            style={{
              fontSize: 11,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text-muted)",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Regenerate
          </button>
        </div>

        <button
          type="button"
          onClick={goNext}
          style={{
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
