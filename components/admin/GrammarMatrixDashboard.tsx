"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  GRAMMAR_CATEGORIES,
  VERIFIED_LEVELS,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "@/lib/grammar/verified-curriculum";
import { GRAMMAR_EXERCISE_TARGET, TIER_LABELS } from "@/lib/grammar/coverage";

export interface GrammarMatrixBlock {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  label: string;
  tierLabel: string;
  totalExerciseCount: number;
  exerciseCount: number;
  extraExerciseCount: number;
  theoryCount: number;
  needsExercises: number;
  gap: boolean;
}

export interface GrammarMatrixCellSelection {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  label: string;
  count: number;
  needsExercises: number;
}

interface Props {
  blocks: GrammarMatrixBlock[];
  target?: number;
  onCellClick?: (cell: GrammarMatrixCellSelection) => void;
}

function cellColors(count: number, target: number) {
  if (count === 0) {
    return { background: "#FEE2E2", color: "#991B1B", border: "0.5px solid #FECACA" };
  }
  if (count < target) {
    return { background: "#FEF3C7", color: "#92400E", border: "0.5px solid #FDE68A" };
  }
  return { background: "#D1FAE5", color: "#065F46", border: "0.5px solid #A7F3D0" };
}

export function GrammarMatrixDashboard({ blocks, target = GRAMMAR_EXERCISE_TARGET, onCellClick }: Props) {
  const [tier, setTier] = useState<GrammarTier>("basic");

  const byKey = useMemo(() => {
    const map = new Map<string, GrammarMatrixBlock>();
    for (const b of blocks) {
      map.set(`${b.level}:${b.category}:${b.tier}`, b);
    }
    return map;
  }, [blocks]);

  const tierBlocks = useMemo(() => blocks.filter(b => b.tier === tier), [blocks, tier]);
  const gapCount = tierBlocks.filter(b => b.gap).length;

  const { matrixTotal, levelTotals } = useMemo(() => {
    let total = 0;
    const perLevel: Record<string, number> = {};
    for (const lv of VERIFIED_LEVELS) perLevel[lv] = 0;
    for (const category of GRAMMAR_CATEGORIES) {
      for (const level of VERIFIED_LEVELS) {
        const block = byKey.get(`${level}:${category}:${tier}`);
        const n = block?.totalExerciseCount ?? 0;
        total += n;
        perLevel[level] += n;
      }
    }
    return { matrixTotal: total, levelTotals: perLevel };
  }, [byKey, tier]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["basic", "advanced"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: 8,
              border: "0.5px solid var(--border)",
              background: tier === t ? "#7F77DD" : "var(--bg)",
              color: tier === t ? "#fff" : "var(--text-muted)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            {TIER_LABELS[t]} · {blocks.filter(b => b.tier === t && b.gap).length} Lücken
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
        {TIER_LABELS[tier]} — Ziel min. {target} Übungen pro Zelle.{" "}
        <span style={{ color: gapCount ? "#991B1B" : "#065F46", fontWeight: 600 }}>
          {gapCount} Lücken
        </span>
      </p>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 4, minWidth: "100%", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{
                textAlign: "left",
                padding: "6px 8px",
                color: "var(--text-muted)",
                fontWeight: 500,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                position: "sticky",
                left: 0,
                background: "var(--surface)",
                zIndex: 1,
              }}>
                Bereich
              </th>
              {VERIFIED_LEVELS.map(lv => (
                <th key={lv} style={{ padding: "6px 4px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, minWidth: 44 }}>
                  {lv}
                </th>
              ))}
              <th style={{ padding: "6px 8px", color: "var(--text-dim)", fontWeight: 500, fontSize: 10 }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {GRAMMAR_CATEGORIES.map(category => {
              const label = CATEGORY_LABELS[category];
              let rowTotal = 0;
              for (const level of VERIFIED_LEVELS) {
                rowTotal += byKey.get(`${level}:${category}:${tier}`)?.totalExerciseCount ?? 0;
              }

              return (
                <tr key={category}>
                  <td style={{
                    padding: "6px 8px",
                    color: "var(--text)",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    maxWidth: 120,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    position: "sticky",
                    left: 0,
                    background: "var(--surface)",
                    zIndex: 1,
                  }} title={label}>
                    {label}
                  </td>
                  {VERIFIED_LEVELS.map(level => {
                    const block = byKey.get(`${level}:${category}:${tier}`);
                    const count = block?.totalExerciseCount ?? 0;
                    const colors = cellColors(count, target);
                    const clickable = !!onCellClick;
                    const needs = block?.needsExercises ?? target;
                    const title = clickable
                      ? `${label} · ${level} · ${TIER_LABELS[tier]} · ${count}/${target} Übungen — Klicken zum Generieren`
                      : `${label} · ${level} · ${count}/${target} Übungen`;

                    const cellStyle = {
                      ...colors,
                      borderRadius: 8,
                      minWidth: 40,
                      minHeight: 36,
                      display: "flex",
                      flexDirection: "column" as const,
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: count > 99 ? 10 : 12,
                      width: "100%",
                      cursor: clickable ? "pointer" : "default",
                      transition: "transform 0.1s ease, box-shadow 0.1s ease",
                      boxShadow: "0 0 0 0 transparent",
                      padding: "4px 2px",
                      gap: 1,
                    };

                    const inner = (
                      <>
                        <span>{count}</span>
                        {(block?.extraExerciseCount ?? 0) > 0 && (
                          <span style={{ fontSize: 8, opacity: 0.75, fontWeight: 500 }}>
                            +{block?.extraExerciseCount}
                          </span>
                        )}
                      </>
                    );

                    return (
                      <td key={level} style={{ padding: 2 }}>
                        {clickable ? (
                          <button
                            type="button"
                            title={title}
                            onClick={() => onCellClick({
                              level,
                              category,
                              tier,
                              label,
                              count,
                              needsExercises: needs,
                            })}
                            style={{
                              ...cellStyle,
                              border: colors.border,
                              fontFamily: "var(--font-mono)",
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = "scale(1.06)";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(127, 119, 221, 0.35)";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
                            }}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div title={title} style={cellStyle}>
                            {inner}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: "6px 8px", color: "var(--accent)", fontWeight: 600, fontSize: 12 }}>
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td style={{
                padding: "8px 8px 4px",
                color: "var(--text-dim)",
                fontSize: 10,
                fontWeight: 500,
                position: "sticky",
                left: 0,
                background: "var(--surface)",
              }}>
                Σ Level
              </td>
              {VERIFIED_LEVELS.map(lv => (
                <td key={lv} style={{ padding: "8px 4px 4px", textAlign: "center", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>
                  {levelTotals[lv]}
                </td>
              ))}
              <td style={{ padding: "8px 8px 4px", color: "#7F77DD", fontWeight: 700, fontSize: 12 }}>
                {matrixTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10, fontSize: 10, color: "var(--text-dim)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "#FEE2E2", border: "0.5px solid #FECACA" }} /> 0
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "#FEF3C7", border: "0.5px solid #FDE68A" }} /> unter {target}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "#D1FAE5", border: "0.5px solid #A7F3D0" }} /> {target}+
        </span>
        <span style={{ marginLeft: "auto" }}>
          {onCellClick ? "Zelle antippen → Generieren · " : ""}
          Zahl = Basis+KV · +N = angereichert
        </span>
      </div>
    </div>
  );
}

export function GrammarGapList({
  gaps,
  onSelect,
}: {
  gaps: GrammarMatrixBlock[];
  onSelect: (cell: GrammarMatrixCellSelection) => void;
}) {
  if (!gaps.length) {
    return (
      <p style={{ fontSize: 12, color: "#065F46", margin: 0 }}>
        Alle Basic- und Advanced-Slots erreichen das Übungsziel.
      </p>
    );
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
      {gaps.slice(0, 16).map(g => (
        <li key={`${g.level}:${g.category}:${g.tier}`} style={{ marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => onSelect({
              level: g.level,
              category: g.category,
              tier: g.tier,
              label: g.label,
              count: g.totalExerciseCount,
              needsExercises: g.needsExercises,
            })}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#7F77DD",
              cursor: "pointer",
              fontSize: 12,
              textAlign: "left",
            }}
          >
            {g.level} · {g.label} · {g.tierLabel}
          </button>
          {" — "}
          {g.totalExerciseCount}/{GRAMMAR_EXERCISE_TARGET} Übungen
          {g.needsExercises > 0 ? ` (noch ${g.needsExercises})` : ""}
        </li>
      ))}
    </ul>
  );
}
