"use client";

import type { GenderArticle } from "@/lib/gender/types";
import type { GenderTabTheme } from "@/lib/gender/theme";
import type { UseGermanGenderReturn } from "@/hooks/useGermanGender";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";

interface GenderProgressTabProps {
  theme: GenderTabTheme;
  gender: UseGermanGenderReturn;
}

const ACHIEVEMENTS = [
  {
    id: "sentenceGraduate" as const,
    emoji: "🎓",
    title: "Sentence graduate",
    desc: "Reach 80% sentence accuracy",
  },
  {
    id: "wordCollector" as const,
    emoji: "📚",
    title: "Word collector",
    desc: "Learn 50 words in Sort",
  },
  {
    id: "genderMaster" as const,
    emoji: "👑",
    title: "Gender master",
    desc: "90% overall sorting accuracy",
  },
  {
    id: "sortStreak" as const,
    emoji: "🔥",
    title: "Hot streak",
    desc: "5 correct sorts in a row",
  },
];

function masteryPct(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

export function GenderProgressTab({ theme, gender }: GenderProgressTabProps) {
  const articles: GenderArticle[] = ["der", "die", "das"];

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
          { label: "Words learned", value: gender.stats.learned.length },
          { label: "Accuracy", value: `${gender.totalAccuracy}%` },
          { label: "Sentence score", value: `${gender.accuracy}%` },
          { label: "Streak", value: gender.streak },
        ].map(stat => (
          <div
            key={stat.label}
            className="ui-card"
            style={{ padding: "12px 14px", border: `1px solid ${theme.tbd}` }}
          >
            <p style={{ fontSize: 11, color: theme.tmid, margin: "0 0 4px" }}>{stat.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: theme.tc, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "0 0 8px" }}>Mastery by gender</p>
      {articles.map(article => {
        const { correct, total } = gender.stats[article];
        const pct = masteryPct(correct, total);
        return (
          <div key={article} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: GENDER_ARTICLE_COLORS[article] }}>{article}</span>
              <span style={{ color: theme.tmid }}>{pct}% · {correct}/{total}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: theme.tbg, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: GENDER_ARTICLE_COLORS[article],
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "16px 0 8px" }}>Achievements</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ACHIEVEMENTS.map(a => {
          const unlocked = gender.achievements[a.id];
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
              <span style={{ fontSize: 28 }}>{a.emoji}</span>
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

      {gender.graduated && (
        <p
          style={{
            marginTop: 14,
            fontSize: 12,
            fontWeight: 600,
            color: theme.tc,
            textAlign: "center",
            padding: 10,
            borderRadius: 10,
            background: theme.tbg,
          }}
        >
          Pure practice unlocked — warm-ups skipped in Practice
        </p>
      )}
    </div>
  );
}
