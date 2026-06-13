"use client";

import { CASE_LEVELS } from "@/lib/cases/types";
import { CASE_COLORS, CASE_LABEL } from "@/lib/cases/theme";
import type { CaseTabTheme } from "@/lib/cases/theme";
import type { UseGermanCasesReturn } from "@/hooks/useGermanCases";

interface CasesProgressTabProps {
  theme: CaseTabTheme;
  cases: UseGermanCasesReturn;
}

const ACHIEVEMENTS = [
  { id: "firstPerfectBuild" as const, emoji: "🏗️", title: "First perfect build", desc: "Complete a challenge build correctly" },
  { id: "dativeDetective" as const, emoji: "🕵️", title: "Dative detective", desc: "20 correct dative-verb objects" },
  { id: "portalMaster" as const, emoji: "🌀", title: "Portal master", desc: "Perfect DOGFU portal round" },
  { id: "nDeclUnlocked" as const, emoji: "📐", title: "n-Deklination unlocked", desc: "First weak masculine correct" },
  { id: "genitivNoble" as const, emoji: "👑", title: "Genitiv noble", desc: "10 correct C1 genitive constructions" },
  { id: "shapeshifter" as const, emoji: "🔀", title: "Shapeshifter", desc: "10 correct Wechsel calls" },
];

export function CasesProgressTab({ theme, cases }: CasesProgressTabProps) {
  const caseKeys = ["nom", "akk", "dat", "gen"] as const;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          { label: "Accuracy", value: `${cases.accuracy}%` },
          { label: "Streak", value: cases.streak },
          { label: "Sessions", value: cases.stats.total },
          { label: "Words seen", value: cases.learned.length },
        ].map(s => (
          <div key={s.label} className="ui-card" style={{ padding: "12px 14px", border: `1px solid ${theme.tbd}` }}>
            <p style={{ fontSize: 11, color: theme.tmid, margin: "0 0 4px" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: theme.tc, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "0 0 8px" }}>Mastery by case</p>
      {caseKeys.map(key => {
        const { correct, total } = cases.perCase[key];
        const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: CASE_COLORS[key] }}>{CASE_LABEL[key]}</span>
              <span style={{ color: theme.tmid }}>{pct}% · {correct}/{total}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: theme.tbg, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: CASE_COLORS[key], borderRadius: 999 }} />
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "16px 0 8px" }}>Level rings</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {CASE_LEVELS.map(lvl => {
          const pct = cases.levelMastery(lvl);
          return (
            <div key={lvl} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: `3px solid ${cases.level === lvl ? theme.tc : theme.tbd}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 4px",
                  fontWeight: 800,
                  fontSize: 12,
                  color: theme.tc,
                }}
              >
                {pct}%
              </div>
              <span style={{ fontSize: 11, color: theme.tmid }}>{lvl}</span>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "0 0 8px" }}>Achievements</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ACHIEVEMENTS.map(a => {
          const unlocked = cases.achievements[a.id];
          return (
            <div
              key={a.id}
              className="ui-card"
              style={{
                padding: "12px 14px",
                border: `1.5px solid ${unlocked ? theme.tbd : "var(--border-light)"}`,
                opacity: unlocked ? 1 : 0.55,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 26 }}>{a.emoji}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: theme.tc, margin: "0 0 2px" }}>
                  {a.title}
                  {unlocked && " ✓"}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{a.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
