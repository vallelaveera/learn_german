"use client";

import { useCallback, useMemo, useState } from "react";
import { BookOpen, LayoutGrid, BarChart3, Sparkles } from "lucide-react";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import type { GenderTab } from "@/lib/gender/types";
import { GENDER_TAB_THEMES } from "@/lib/gender/theme";
import { speakMayaGenderSentence } from "@/lib/gender/speakMaya";
import { useGermanGender } from "@/hooks/useGermanGender";
import { GenderPracticeTab } from "./GenderPracticeTab";
import { GenderPatternsTab } from "./GenderPatternsTab";
import { GenderSortTab } from "./GenderSortTab";
import { GenderProgressTab } from "./GenderProgressTab";
import { GraduationModal } from "./GraduationModal";

const TABS: { id: GenderTab; label: string; icon: React.ReactNode }[] = [
  { id: "practice", label: "Practice", icon: <Sparkles size={16} /> },
  { id: "patterns", label: "Patterns", icon: <BookOpen size={16} /> },
  { id: "sort", label: "Sort", icon: <LayoutGrid size={16} /> },
  { id: "progress", label: "Progress", icon: <BarChart3 size={16} /> },
];

export function GrammarGenderScreen() {
  const [tab, setTab] = useState<GenderTab>("practice");
  const [speaking, setSpeaking] = useState(false);
  const gender = useGermanGender();
  const theme = GENDER_TAB_THEMES[tab];

  const level = Math.floor(gender.xp / 100) + 1;
  const xpInLevel = gender.xp % 100;

  const onSpeak = useCallback(async (text: string) => {
    if (speaking) return;
    setSpeaking(true);
    try {
      await speakMayaGenderSentence(text);
    } catch {
      // ignore — button returns to idle
    } finally {
      setSpeaking(false);
    }
  }, [speaking]);

  const tabStyle = useMemo(
    () =>
      ({
        "--tc": theme.tc,
        "--tbg": theme.tbg,
        "--tbd": theme.tbd,
        "--tmid": theme.tmid,
      }) as React.CSSProperties,
    [theme],
  );

  if (!gender.hydrated) {
    return (
      <ExerciseShell backHref="/grammar" showTabBar={false}>
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Lädt...</div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell backHref="/grammar" showTabBar={false}>
      <div style={{ padding: "0 18px 18px", ...tabStyle }}>
        <ExerciseBackLink href="/grammar" label="← Grammatik" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.tmid,
                margin: "0 0 4px",
              }}
            >
              A1–C1 · Genus & Artikel
            </p>
            <h1 className="ui-title-serif" style={{ fontSize: 22, margin: 0, color: theme.tc }}>
              DER DIE DAS Üben
            </h1>
          </div>
          <div
            style={{
              minWidth: 44,
              minHeight: 44,
              borderRadius: 12,
              background: theme.tc,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 12,
              padding: "4px 10px",
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.85 }}>LVL</span>
            {level}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.tmid, marginBottom: 4 }}>
            <span>{gender.xp} XP</span>
            <span>{xpInLevel}/100</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: theme.tbg, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${xpInLevel}%`,
                background: theme.tc,
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        <div
          className="ui-card"
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            marginBottom: 16,
            border: `1px solid ${theme.tbd}`,
          }}
        >
          {TABS.map(t => {
            const active = tab === t.id;
            const tTheme = GENDER_TAB_THEMES[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  border: "none",
                  background: active ? tTheme.tbg : "transparent",
                  color: active ? tTheme.tc : "var(--text-muted)",
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "practice" && (
          <GenderPracticeTab theme={theme} gender={gender} onSpeak={onSpeak} speaking={speaking} />
        )}
        {tab === "patterns" && <GenderPatternsTab theme={theme} onSpeak={text => void onSpeak(text)} />}
        {tab === "sort" && <GenderSortTab theme={theme} gender={gender} />}
        {tab === "progress" && <GenderProgressTab theme={theme} gender={gender} />}
      </div>

      {gender.showGraduation && (
        <GraduationModal
          theme={GENDER_TAB_THEMES.practice}
          accuracy={gender.accuracy}
          onUnlock={gender.unlockGraduation}
          onKeepWarmups={gender.dismissGraduation}
        />
      )}
    </ExerciseShell>
  );
}
