"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GrammarDetailSheet } from "@/components/grammar/GrammarDetailSheet";
import {
  getGrammarLevel,
  GRAMMAR_LEVEL_IDS,
  practiceTypeLabel,
  type GrammarLevelId,
  type GrammarPoint,
} from "@/lib/grammar/curriculum";

export default function GrammarPage() {
  const [levelId, setLevelId] = useState<GrammarLevelId>("A1");
  const [selectedPoint, setSelectedPoint] = useState<GrammarPoint | null>(null);

  const level = getGrammarLevel(levelId);
  const points = useMemo(() => level?.points ?? [], [level]);

  return (
    <PageShell showTabBar title="Grammatik">
      <div className="ui-page" style={{ paddingTop: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <p className="ui-muted" style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.5 }}>
            Wähle dein Level — tippe ein Thema für Erklärung und Übung mit Maya.
          </p>
          {level && (
            <p style={{ fontSize: 12, color: level.color, margin: 0, fontWeight: 600 }}>
              {level.label}
            </p>
          )}
        </div>

        <SegmentedTabs
          tabs={GRAMMAR_LEVEL_IDS.map(id => ({ id, label: id }))}
          value={levelId}
          onChange={setLevelId}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 12,
          }}
        >
          {points.map(point => (
            <button
              key={point.id}
              type="button"
              onClick={() => setSelectedPoint(point)}
              className="ui-card"
              style={{
                textAlign: "left",
                padding: "16px 16px 14px",
                border: `1px solid ${level?.lightColor ?? "var(--border-light)"}`,
                background: "#fff",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <div>
                  <h3 className="ui-title-serif" style={{ fontSize: 17, margin: "0 0 4px", lineHeight: 1.3 }}>
                    {point.title}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    {point.subtitle}
                  </p>
                </div>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: level?.lightColor ?? "var(--accent-soft)",
                    color: level?.color ?? "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={16} />
                </span>
              </div>

              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--text)",
                  lineHeight: 1.45,
                  margin: "0 0 12px",
                }}
              >
                {point.example.de}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {point.practiceTypes.slice(0, 4).map(type => (
                  <span
                    key={type}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "var(--bg-warm)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-light)",
                    }}
                  >
                    {practiceTypeLabel(type)}
                  </span>
                ))}
                {point.practiceTypes.length > 4 && (
                  <span style={{ fontSize: 10, color: "var(--text-dim)", alignSelf: "center" }}>
                    +{point.practiceTypes.length - 4}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {points.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 24 }}>
            Keine Grammatikpunkte für dieses Level.
          </p>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href="/mode" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            ← Zurück zur Startseite
          </Link>
        </div>
      </div>

      {selectedPoint && level && (
        <GrammarDetailSheet
          point={selectedPoint}
          level={level}
          onClose={() => setSelectedPoint(null)}
        />
      )}
    </PageShell>
  );
}
