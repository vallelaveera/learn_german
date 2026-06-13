"use client";

import { useCallback, useMemo, useState } from "react";
import { BookOpen, Clock, BarChart3, Sparkles } from "lucide-react";
import { ExerciseBackLink, ExerciseShell } from "@/components/layout/ExerciseShell";
import { TenseTimeline } from "@/components/TenseTimeline";
import { speakMayaTense } from "@/lib/tenses/speakMaya";

type TenseTab = "patterns" | "practice" | "compare" | "progress";

const THEME = {
  tc: "#6B4FA0",
  tbg: "rgba(107, 79, 160, 0.1)",
  tbd: "rgba(107, 79, 160, 0.28)",
  tmid: "#6B4FA0",
};

const TABS: { id: TenseTab; label: string; icon: React.ReactNode }[] = [
  { id: "patterns", label: "Patterns", icon: <BookOpen size={16} /> },
  { id: "practice", label: "Practice", icon: <Sparkles size={16} /> },
  { id: "compare", label: "Compare", icon: <Clock size={16} /> },
  { id: "progress", label: "Progress", icon: <BarChart3 size={16} /> },
];

export function GrammarTensesScreen() {
  const [tab, setTab] = useState<TenseTab>("patterns");
  const [speaking, setSpeaking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [landscape, setLandscape] = useState(false);

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
        "--tc": THEME.tc,
        "--tbg": THEME.tbg,
        "--tbd": THEME.tbd,
        "--tmid": THEME.tmid,
      }) as React.CSSProperties,
    [],
  );

  const showTimeline = tab === "patterns";

  return (
    <ExerciseShell backHref="/grammar" showTabBar={!expanded}>
      <div style={{ padding: "0 18px 18px", ...tabStyle }}>
        {!expanded && <ExerciseBackLink href="/grammar" label="← Grammatik" />}

        {!expanded && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: THEME.tmid,
                    margin: "0 0 4px",
                  }}
                >
                  A1–C1 · Zeitformen
                </p>
                <h1 className="ui-title-serif" style={{ fontSize: 22, margin: 0, color: THEME.tc }}>
                  Zeiten verstehen
                </h1>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {TABS.map(t => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    style={{
                      flex: "1 1 72px",
                      minHeight: 40,
                      borderRadius: 10,
                      border: active ? `2px solid ${THEME.tc}` : `1px solid ${THEME.tbd}`,
                      background: active ? THEME.tbg : "#fff",
                      color: active ? THEME.tc : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {showTimeline && (
          <div
            style={
              expanded
                ? {
                    position: "fixed",
                    inset: 0,
                    zIndex: 200,
                    background: "var(--bg-warm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: landscape ? 8 : 16,
                    overflow: "auto",
                  }
                : undefined
            }
          >
            <div style={{ width: "100%", maxWidth: expanded ? (landscape ? "100dvh" : 390) : undefined }}>
              <TenseTimeline
                onSpeak={onSpeak}
                compact={!expanded}
                expanded={expanded}
                onExpand={() => setExpanded(true)}
                onMinimize={() => {
                  setExpanded(false);
                  setLandscape(false);
                }}
                landscape={landscape}
                onToggleLandscape={() => setLandscape(l => !l)}
              />
            </div>
          </div>
        )}

        {!expanded && tab !== "patterns" && (
          <div
            className="ui-card"
            style={{
              padding: 20,
              textAlign: "center",
              border: `1px solid ${THEME.tbd}`,
              color: "var(--text-muted)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <p style={{ margin: "0 0 8px", fontWeight: 700, color: THEME.tc }}>
              {tab === "practice" && "Practice"}
              {tab === "compare" && "Compare"}
              {tab === "progress" && "Progress"}
            </p>
            <p style={{ margin: 0 }}>Coming soon — start with the Patterns timeline.</p>
          </div>
        )}
      </div>
    </ExerciseShell>
  );
}
