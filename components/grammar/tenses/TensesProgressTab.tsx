"use client";

import { buildTensesForLevel } from "@/constants/germanTenses";
import { TENSE_LEVELS } from "@/lib/tenses/types";
import { TENSE_ACCENT } from "@/lib/tenses/theme";
import type { TenseTabTheme } from "@/lib/tenses/theme";
import type { UseGermanTensesReturn } from "@/hooks/useGermanTenses";

interface TensesProgressTabProps {
  theme: TenseTabTheme;
  tenses: UseGermanTensesReturn;
}

const ACHIEVEMENTS = [
  { id: "firstKlammer" as const, emoji: "🏗️", title: "First Klammer", desc: "Close the verb bracket correctly" },
  { id: "timelineExplorer" as const, emoji: "🛣️", title: "Timeline explorer", desc: "Visit all 6 timeline tenses" },
  { id: "partizipPro" as const, emoji: "🔧", title: "Partizip pro", desc: "6 correct Partizip II builds" },
  { id: "auxMaster" as const, emoji: "⚖️", title: "Aux master", desc: "10 correct haben/sein sorts" },
  { id: "b2Unlock" as const, emoji: "📈", title: "B2 unlocked", desc: "Practice at B2 level" },
  { id: "c1Unlock" as const, emoji: "🎓", title: "C1 unlocked", desc: "Practice at C1 level" },
];

export function TensesProgressTab({ theme, tenses }: TensesProgressTabProps) {
  const timelineTenses = buildTensesForLevel(tenses.level);
  const gamifyLevel = Math.floor(tenses.xp / 100) + 1;
  const xpInLevel = tenses.xp % 100;
  const xpBarPct = xpInLevel === 0 && tenses.xp > 0 ? 100 : xpInLevel;
  const xpBarLabel = xpInLevel === 0 && tenses.xp > 0 ? 100 : xpInLevel;

  return (
    <div>
      <div className="ui-card" style={{ padding: "12px 14px", marginBottom: 16, border: `1px solid ${theme.tbd}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.tmid, marginBottom: 6 }}>
          <span>{tenses.xp} XP · Lvl {gamifyLevel}</span>
          <span>{xpBarLabel}/100</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: theme.tbg, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${xpBarPct}%`,
              background: theme.tc,
              borderRadius: 999,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Accuracy", value: `${tenses.accuracy}%` },
          { label: "Streak", value: tenses.streak },
          { label: "Sessions", value: tenses.stats.total },
          { label: "Verbs seen", value: tenses.learned.length },
        ].map(s => (
          <div key={s.label} className="ui-card" style={{ padding: "12px 14px", border: `1px solid ${theme.tbd}` }}>
            <p style={{ fontSize: 11, color: theme.tmid, margin: "0 0 4px" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: theme.tc, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "0 0 8px" }}>Mastery by tense</p>
      {timelineTenses.map(t => {
        const pct = tenses.tenseMastery(t.id);
        const { correct, total } = tenses.perTense[t.id];
        return (
          <div key={t.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: TENSE_ACCENT[t.id] ?? theme.tc }}>{t.label}</span>
              <span style={{ color: theme.tmid }}>{pct}% · {correct}/{total}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: theme.tbg, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: TENSE_ACCENT[t.id] ?? theme.tc, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "16px 0 8px" }}>Level rings</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TENSE_LEVELS.map(lvl => {
          const pct = tenses.levelMastery(lvl);
          return (
            <div key={lvl} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  border: `3px solid ${tenses.level === lvl ? theme.tc : theme.tbd}`,
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
          const unlocked = tenses.achievements[a.id];
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
