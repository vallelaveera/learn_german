"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export interface MatrixCategoryRow {
  category: string;
  labelDe: string;
  words: number;
  sentences: number;
  byLevel: Record<string, { words: number; sentences: number }>;
}

export interface MatrixCellSelection {
  category: string;
  labelDe: string;
  level: string;
  type: "words" | "sentences";
  count: number;
}

interface Props {
  categories: MatrixCategoryRow[];
  targets?: { words: number; sentences: number };
  onCellClick?: (cell: MatrixCellSelection) => void;
  /** When false, only empty (red) cells are clickable. Default: true (red + yellow). */
  clickableLowCells?: boolean;
}

type ViewMode = "words" | "sentences";

function cellColors(count: number, target: number) {
  if (count === 0) {
    return { background: "#FEE2E2", color: "#991B1B", border: "0.5px solid #FECACA", tier: "empty" as const };
  }
  if (count < Math.max(3, Math.floor(target / 3))) {
    return { background: "#FEF3C7", color: "#92400E", border: "0.5px solid #FDE68A", tier: "low" as const };
  }
  return { background: "#D1FAE5", color: "#065F46", border: "0.5px solid #A7F3D0", tier: "good" as const };
}

function isCellClickable(tier: "empty" | "low" | "good", clickableLowCells: boolean) {
  if (tier === "empty") return true;
  if (tier === "low" && clickableLowCells) return true;
  return false;
}

export function CorpusMatrixDashboard({
  categories,
  targets,
  onCellClick,
  clickableLowCells = true,
}: Props) {
  const [mode, setMode] = useState<ViewMode>("words");
  const target = mode === "words" ? (targets?.words ?? 15) : (targets?.sentences ?? 15);

  const { matrixTotal, levelTotals } = useMemo(() => {
    let total = 0;
    const perLevel: Record<string, number> = {};
    for (const lv of LEVELS) perLevel[lv] = 0;
    for (const row of categories) {
      for (const lv of LEVELS) {
        const n = row.byLevel[lv]?.[mode] ?? 0;
        total += n;
        perLevel[lv] += n;
      }
    }
    return { matrixTotal: total, levelTotals: perLevel };
  }, [categories, mode]);

  if (!categories.length) {
    return (
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
        Noch kein generierter Corpus-Inhalt.
      </p>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["words", "sentences"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: 8,
              border: "0.5px solid var(--border)",
              background: mode === m ? "#7F77DD" : "var(--bg)",
              color: mode === m ? "#fff" : "var(--text-muted)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            {m === "words" ? "Wörter" : "Sätze"}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 4, minWidth: "100%", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", position: "sticky", left: 0, background: "var(--surface)", zIndex: 1 }}>
                Kategorie
              </th>
              {LEVELS.map(lv => (
                <th key={lv} style={{ padding: "6px 4px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, minWidth: 44 }}>
                  {lv}
                </th>
              ))}
              <th style={{ padding: "6px 8px", color: "var(--text-dim)", fontWeight: 500, fontSize: 10 }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(row => {
              const rowTotal = mode === "words" ? row.words : row.sentences;
              return (
                <tr key={row.category}>
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
                  }} title={row.labelDe}>
                    {row.labelDe}
                  </td>
                  {LEVELS.map(lv => {
                    const count = row.byLevel[lv]?.[mode] ?? 0;
                    const { tier, ...colors } = cellColors(count, target);
                    const clickable = onCellClick && isCellClickable(tier, clickableLowCells);
                    const label = mode === "words" ? "Wörter" : "Sätze";
                    const title = clickable
                      ? `${row.labelDe} · ${lv} · ${count} ${label} — Klicken zum Generieren`
                      : `${row.labelDe} · ${lv} · ${count} ${label}`;

                    const cellStyle = {
                      ...colors,
                      borderRadius: 8,
                      minWidth: 40,
                      minHeight: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: count > 99 ? 10 : 12,
                      width: "100%",
                      cursor: clickable ? "pointer" : "default",
                      transition: "transform 0.1s ease, box-shadow 0.1s ease",
                      boxShadow: clickable ? "0 0 0 0 transparent" : undefined,
                    } as const;

                    return (
                      <td key={lv} style={{ padding: 2 }}>
                        {clickable ? (
                          <button
                            type="button"
                            title={title}
                            onClick={() => onCellClick({
                              category: row.category,
                              labelDe: row.labelDe,
                              level: lv,
                              type: mode,
                              count,
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
                              e.currentTarget.style.boxShadow = "0 0 0 transparent";
                            }}
                          >
                            {count}
                          </button>
                        ) : (
                          <div title={title} style={cellStyle}>
                            {count}
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
              <td style={{ padding: "8px 8px 4px", color: "var(--text-dim)", fontSize: 10, fontWeight: 500, position: "sticky", left: 0, background: "var(--surface)" }}>
                Σ Level
              </td>
              {LEVELS.map(lv => (
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
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "#FEF3C7", border: "0.5px solid #FDE68A" }} /> wenig
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "#D1FAE5", border: "0.5px solid #A7F3D0" }} /> gut
        </span>
        <span style={{ marginLeft: "auto" }}>
          {onCellClick ? "Rot/gelb antippen → Generieren · " : ""}
          Ziel pro Kategorie: {target}+ {mode === "words" ? "W" : "S"} gesamt
        </span>
      </div>

      {!onCellClick && (
      <Link href="/admin/generate" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "#7F77DD", fontWeight: 500, textDecoration: "none" }}>
        Lücken füllen → Inhalt generieren
      </Link>
      )}
    </div>
  );
}
