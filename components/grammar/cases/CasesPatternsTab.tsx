"use client";

import { useMemo, useState } from "react";
import { Bolt, Target, Gift, Key, Shuffle, Volume2 } from "lucide-react";
import { definiteArticle, changedGendersForCase } from "@/lib/cases/declension";
import { sentencesForLevel } from "@/lib/cases/germanCasePatterns";
import type { CaseKey, CaseLevel } from "@/lib/cases/types";
import { CASE_CHARACTER, CASE_COLORS, CASE_LABEL, CASE_QUESTION, CASE_ROLE } from "@/lib/cases/theme";
import type { CaseTabTheme } from "@/lib/cases/theme";
import type { GenderId } from "@/lib/articles/types";
import { GENDER_SHORT } from "@/lib/articles/declension";

interface CasesPatternsTabProps {
  theme: CaseTabTheme;
  level: CaseLevel;
  onSpeak: (text: string) => Promise<void>;
}

const CASE_ICONS: Record<CaseKey, React.ReactNode> = {
  nom: <Bolt size={14} />,
  akk: <Target size={14} />,
  dat: <Gift size={14} />,
  gen: <Key size={14} />,
  wechsel: <Shuffle size={14} />,
};

const MORPH_GENDERS: { id: GenderId; label: string }[] = [
  { id: "m", label: "masc" },
  { id: "f", label: "fem" },
  { id: "n", label: "neut" },
  { id: "pl", label: "pl" },
];

export function CasesPatternsTab({ theme, level, onSpeak }: CasesPatternsTabProps) {
  const [morphGender, setMorphGender] = useState<GenderId>("m");
  const [morphCase, setMorphCase] = useState<Exclude<CaseKey, "wechsel">>("nom");
  const [subTab, setSubTab] = useState<CaseKey>("nom");

  const morphArticle = definiteArticle(
    morphGender === "pl" ? "m" : (morphGender as "m" | "f" | "n"),
    morphCase,
    morphGender === "pl",
  );

  const examples = useMemo(
    () => sentencesForLevel(level, subTab === "wechsel" ? "wechsel" : subTab),
    [level, subTab],
  );

  const subColor = CASE_COLORS[subTab === "wechsel" ? "wechsel" : subTab];

  return (
    <div>
      <p style={{ fontSize: 12, color: theme.tmid, margin: "0 0 10px" }}>Morph machine</p>
      <div className="ui-card" style={{ padding: 14, marginBottom: 14, border: `1px solid ${theme.tbd}` }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {MORPH_GENDERS.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setMorphGender(g.id)}
              style={{
                minHeight: 36,
                padding: "0 10px",
                borderRadius: 8,
                border: morphGender === g.id ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
                background: morphGender === g.id ? theme.tbg : "#fff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {(["nom", "akk", "dat", "gen"] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setMorphCase(c)}
              style={{
                minHeight: 36,
                padding: "0 10px",
                borderRadius: 8,
                border: morphCase === c ? `2px solid ${CASE_COLORS[c]}` : `1px solid ${theme.tbd}`,
                background: morphCase === c ? `${CASE_COLORS[c]}18` : "#fff",
                color: CASE_COLORS[c],
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {CASE_LABEL[c]}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 36, fontWeight: 900, color: CASE_COLORS[morphCase], margin: "0 0 4px" }}>
          {morphArticle}
        </p>
        <p style={{ fontSize: 12, color: theme.tmid, margin: 0 }}>
          {CASE_ROLE[morphCase]} · {CASE_QUESTION[morphCase]}
        </p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {(["nom", "akk", "dat", "gen", "wechsel"] as const).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setSubTab(c)}
            style={{
              minHeight: 40,
              padding: "0 10px",
              borderRadius: 10,
              border: subTab === c ? `2px solid ${CASE_COLORS[c]}` : `1px solid ${theme.tbd}`,
              background: subTab === c ? `${CASE_COLORS[c]}14` : "#fff",
              color: CASE_COLORS[c],
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {CASE_ICONS[c]}
            {c === "wechsel" ? "Wechsel" : CASE_LABEL[c].slice(0, 3)}
          </button>
        ))}
      </div>

      <div
        className="ui-card"
        style={{ padding: 14, marginBottom: 12, border: `1.5px solid ${subColor}` }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: subColor, margin: "0 0 6px" }}>
          {subTab === "wechsel" ? "Wechselpräpositionen" : CASE_LABEL[subTab]} · {subTab !== "wechsel" && CASE_QUESTION[subTab]}
        </p>
        {subTab !== "wechsel" && (
          <>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px" }}>
              {CASE_CHARACTER[morphGender === "pl" ? "pl" : morphGender]}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {MORPH_GENDERS.map(g => {
                const art = definiteArticle(
                  g.id === "pl" ? "m" : (g.id as "m" | "f" | "n"),
                  subTab,
                  g.id === "pl",
                );
                const changed = changedGendersForCase(subTab).includes(g.id);
                return (
                  <span
                    key={g.id}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      background: changed ? `${subColor}22` : "#f5f5f5",
                      border: changed ? `2px solid ${subColor}` : "1px solid #e5e5e5",
                    }}
                  >
                    {GENDER_SHORT[g.id]} {art}
                  </span>
                );
              })}
            </div>
          </>
        )}
        {subTab === "wechsel" && (
          <div style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 6px" }}>
              <strong style={{ color: CASE_COLORS.akk }}>wohin?</strong> → Akkusativ (Bewegung):{" "}
              <em>in die Schule</em>
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: CASE_COLORS.dat }}>wo?</strong> → Dativ (Ort):{" "}
              <em>in der Schule</em>
            </p>
          </div>
        )}
        {examples.map(ex => {
          const full = `${ex.pre}${ex.highlight}${ex.post}`;
          return (
            <div key={ex.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border-light)" }}>
              <p style={{ fontSize: 14, margin: "0 0 4px", lineHeight: 1.5 }}>
                {ex.pre}
                <span style={{ color: subColor, fontWeight: 700 }}>{ex.highlight}</span>
                {ex.post}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{ex.en}</span>
                <button
                  type="button"
                  onClick={() => void onSpeak(full)}
                  aria-label="Maya"
                  style={{
                    minWidth: 40,
                    minHeight: 40,
                    borderRadius: 10,
                    border: `1px solid ${theme.tbd}`,
                    background: theme.tbg,
                    color: theme.tc,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Volume2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
