"use client";

import { useCallback, useMemo, useState } from "react";
import { Hammer, BookOpen, DoorOpen, BarChart3 } from "lucide-react";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import type { CaseLevel, CaseTab } from "@/lib/cases/types";
import { CASE_LEVELS } from "@/lib/cases/types";
import { CASE_TAB_THEMES } from "@/lib/cases/theme";
import { speakMayaGerman } from "@/lib/cases/speakMaya";
import { useGermanCases } from "@/hooks/useGermanCases";
import { CasesBuildTab } from "./CasesBuildTab";
import { CasesPatternsTab } from "./CasesPatternsTab";
import { CasesPortalsTab } from "./CasesPortalsTab";
import { CasesProgressTab } from "./CasesProgressTab";

const TABS: { id: CaseTab; label: string; icon: React.ReactNode }[] = [
  { id: "build", label: "Build", icon: <Hammer size={16} /> },
  { id: "patterns", label: "Patterns", icon: <BookOpen size={16} /> },
  { id: "portals", label: "Portals", icon: <DoorOpen size={16} /> },
  { id: "progress", label: "Progress", icon: <BarChart3 size={16} /> },
];

export function GrammarCasesScreen() {
  const [tab, setTab] = useState<CaseTab>("build");
  const [speaking, setSpeaking] = useState(false);
  const casesState = useGermanCases();
  const theme = CASE_TAB_THEMES[tab];

  const level = Math.floor(casesState.xp / 100) + 1;
  const xpInLevel = casesState.xp % 100;

  const onSpeak = useCallback(async (text: string) => {
    if (speaking) return;
    setSpeaking(true);
    try {
      await speakMayaGerman(text);
    } catch {
      // ignore
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

  if (!casesState.hydrated) {
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
              B1–C2 · Kasus & Fälle
            </p>
            <h1 className="ui-title-serif" style={{ fontSize: 22, margin: 0, color: theme.tc }}>
              Fälle meistern
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

        <SegmentedTabs
          tabs={CASE_LEVELS.map(id => ({ id, label: id }))}
          value={casesState.level}
          onChange={casesState.setLevel}
        />

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.tmid, marginBottom: 4 }}>
            <span>{casesState.xp} XP</span>
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
            const tTheme = CASE_TAB_THEMES[t.id];
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

        {tab === "build" && (
          <CasesBuildTab theme={theme} cases={casesState} onSpeak={onSpeak} speaking={speaking} />
        )}
        {tab === "patterns" && (
          <CasesPatternsTab theme={theme} level={casesState.level} onSpeak={onSpeak} />
        )}
        {tab === "portals" && <CasesPortalsTab theme={theme} cases={casesState} />}
        {tab === "progress" && <CasesProgressTab theme={theme} cases={casesState} />}
      </div>
    </ExerciseShell>
  );
}
