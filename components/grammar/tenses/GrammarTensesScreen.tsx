"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hammer, BookOpen, Wrench, BarChart3 } from "lucide-react";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { GrammarTierToggle } from "@/components/grammar/catalog/GrammarTierToggle";
import type { TenseTab } from "@/lib/tenses/types";
import { TENSE_LEVELS } from "@/lib/tenses/types";
import { TENSE_TAB_THEMES } from "@/lib/tenses/theme";
import { speakMayaTense } from "@/lib/tenses/speakMaya";
import { useGermanTenses } from "@/hooks/useGermanTenses";
import { levelColor, levelLightColor } from "@/lib/grammar/verified-curriculum";
import { parseGrammarTier, parseVerifiedLevel } from "@/lib/grammar/tier-preference";
import { TensesBuildTab } from "./TensesBuildTab";
import { TensesPatternsTab } from "./TensesPatternsTab";
import { TensesWorkshopTab } from "./TensesWorkshopTab";
import { TensesProgressTab } from "./TensesProgressTab";

const TABS: { id: TenseTab; label: string; icon: React.ReactNode }[] = [
  { id: "build", label: "Build", icon: <Hammer size={16} /> },
  { id: "patterns", label: "Patterns", icon: <BookOpen size={16} /> },
  { id: "workshop", label: "Workshop", icon: <Wrench size={16} /> },
  { id: "progress", label: "Progress", icon: <BarChart3 size={16} /> },
];

export function GrammarTensesScreen() {
  const searchParams = useSearchParams();
  const catalogLevel = parseVerifiedLevel(searchParams.get("level"), "B1");
  const catalogTier = parseGrammarTier(searchParams.get("tier"));
  const catalogColor = levelColor(catalogLevel);
  const catalogLight = levelLightColor(catalogLevel);
  const [tab, setTab] = useState<TenseTab>("build");
  const [speaking, setSpeaking] = useState(false);
  const tensesState = useGermanTenses();
  const theme = TENSE_TAB_THEMES[tab];

  const xpLevel = Math.floor(tensesState.xp / 100) + 1;

  const onSpeak = useCallback(async (text: string, _lang?: string) => {
    if (speaking) return;
    setSpeaking(true);
    try {
      await speakMayaTense(text);
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

  if (!tensesState.hydrated) {
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

        <GrammarTierToggle
          level={catalogLevel}
          category="tenses"
          tier={catalogTier}
          color={catalogColor}
          light={catalogLight}
        />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="ui-title-serif" style={{ fontSize: 22, margin: "0 0 6px", color: theme.tc }}>
              Zeiten verstehen
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: theme.tmid, letterSpacing: "0.04em" }}>
                LEVEL
              </span>
              {TENSE_LEVELS.map(l => {
                const active = tensesState.level === l;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => tensesState.setLevel(l)}
                    style={{
                      minHeight: 26,
                      padding: "2px 9px",
                      borderRadius: 999,
                      border: active ? `1.5px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
                      background: active ? theme.tbg : "#fff",
                      color: active ? theme.tc : "var(--text-muted)",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            style={{
              flexShrink: 0,
              minWidth: 40,
              minHeight: 40,
              borderRadius: 10,
              background: theme.tc,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 11,
              padding: "3px 8px",
            }}
          >
            <span style={{ fontSize: 9, opacity: 0.85 }}>LVL</span>
            {xpLevel}
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
            const tTheme = TENSE_TAB_THEMES[t.id];
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
          <TensesBuildTab theme={theme} tenses={tensesState} onSpeak={onSpeak} speaking={speaking} />
        )}
        {tab === "patterns" && <TensesPatternsTab theme={theme} tenses={tensesState} onSpeak={onSpeak} />}
        {tab === "workshop" && <TensesWorkshopTab theme={theme} tenses={tensesState} />}
        {tab === "progress" && <TensesProgressTab theme={theme} tenses={tensesState} />}
      </div>
    </ExerciseShell>
  );
}
