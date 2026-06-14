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

interface Props {
  blocks: GrammarMatrixBlock[];
  target?: number;
  onCellClick?: (level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier) => void;
}

function cellColors(count: number, target: number, gap: boolean) {
  if (gap || count === 0) {
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
        {TIER_LABELS[tier]} practice sessions — Ziel min. {target} pro Zelle.{" "}
        <span style={{ color: gapCount ? "#991B1B" : "#065F46", fontWeight: 600 }}>
          {gapCount} Lücken
        </span>
      </p>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 4, minWidth: "100%", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600 }}>Level</th>
              {GRAMMAR_CATEGORIES.map(cat => (
                <th key={cat} style={{ textAlign: "center", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600 }}>
                  {CATEGORY_LABELS[cat]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VERIFIED_LEVELS.map(level => (
              <tr key={level}>
                <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--text)" }}>{level}</td>
                {GRAMMAR_CATEGORIES.map(category => {
                  const block = byKey.get(`${level}:${category}:${tier}`);
                  const count = block?.totalExerciseCount ?? 0;
                  const colors = cellColors(count, target, block?.gap ?? true);
                  const inner = (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{count}</div>
                      <div style={{ fontSize: 9, opacity: 0.85 }}>
                        {block?.exerciseCount ?? 0}+{block?.extraExerciseCount ?? 0}
                      </div>
                      <div style={{ fontSize: 8, opacity: 0.7 }}>{block?.theoryCount ?? 0} th</div>
                    </>
                  );
                  const style: React.CSSProperties = {
                    minWidth: 72,
                    padding: "8px 6px",
                    borderRadius: 8,
                    textAlign: "center",
                    background: colors.background,
                    color: colors.color,
                    border: colors.border,
                    cursor: onCellClick ? "pointer" : "default",
                  };
                  if (onCellClick) {
                    return (
                      <td key={category}>
                        <button type="button" onClick={() => onCellClick(level, category, tier)} style={{ ...style, width: "100%" }}>
                          {inner}
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td key={category}>
                      <div style={style}>{inner}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 10, color: "var(--text-dim)", margin: "10px 0 0" }}>
        Zelle = Übungen (Basis+KV) · th = Theoriepunkte für {TIER_LABELS[tier]}
      </p>
    </div>
  );
}

export function GrammarGapList({
  gaps,
  onSelect,
}: {
  gaps: GrammarMatrixBlock[];
  onSelect: (level: VerifiedLevel, category: GrammarCategory, tier: GrammarTier) => void;
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
            onClick={() => onSelect(g.level, g.category, g.tier)}
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
