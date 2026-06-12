"use client";

import { useEffect, useState } from "react";
import { PRACTICE_SCENARIOS, scenarioProgressFromWords } from "@/lib/exercises/scenarios";
import { ScenarioPracticeSheet } from "./ScenarioPracticeSheet";
import type { PracticeScenario } from "@/lib/exercises/scenarios";

interface VocabWord {
  word: string;
  usedByUser?: boolean;
}

function progressTier(heard: number, practiced: number): "empty" | "started" | "strong" {
  if (practiced >= 3) return "strong";
  if (heard >= 1 || practiced >= 1) return "started";
  return "empty";
}

const TIER_STYLE = {
  empty: { ring: "var(--border-light)", fill: "transparent", opacity: 0.85 },
  started: { ring: "var(--accent-glow)", fill: "var(--accent-soft)", opacity: 1 },
  strong: { ring: "rgba(56,161,105,0.35)", fill: "var(--brand-green-soft)", opacity: 1 },
};

export function PracticeJourneyMap() {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [selected, setSelected] = useState<PracticeScenario | null>(null);

  useEffect(() => {
    fetch("/api/vocab")
      .then(r => r.json())
      .then(d => setVocab(d.words ?? []))
      .catch(() => {});
  }, []);

  return (
    <>
      <section
        className="ui-card animate-fade-in"
        style={{
          padding: "18px 16px 16px",
          marginTop: 4,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <p className="ui-label" style={{ marginBottom: 4 }}>Deine Situationen</p>
          <h2 className="ui-title-serif" style={{ fontSize: 18, margin: "0 0 4px" }}>
            Wo willst du üben?
          </h2>
          <p className="ui-muted" style={{ margin: 0, fontSize: 12 }}>
            Tippe eine Blase — dann Wörter, Sätze oder Anruf
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {PRACTICE_SCENARIOS.map(scenario => {
            const { heard, practiced } = scenarioProgressFromWords(vocab, scenario);
            const tier = progressTier(heard, practiced);

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelected(scenario)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 4px",
                  borderRadius: 18,
                  border: `2px solid ${TIER_STYLE[tier].ring}`,
                  background: TIER_STYLE[tier].fill,
                  cursor: "pointer",
                  opacity: TIER_STYLE[tier].opacity,
                  transition: "transform 0.12s ease",
                }}
                onMouseDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
                onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{scenario.emoji}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: tier === "strong" ? "var(--green)" : "var(--text-muted)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {scenario.label}
                </span>
                {heard > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {practiced}/{heard}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <ScenarioPracticeSheet scenario={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
