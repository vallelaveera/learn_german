"use client";

import { useEffect, useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { TenseTimeline } from "@/components/TenseTimeline";
import {
  buildTensesForLevel,
  verbsForLevel,
  type BuildTenseId,
  type SubjectId,
  type VerbId,
} from "@/constants/germanTenses";
import { SUBJECTS } from "@/constants/germanTenses";
import { patternsForLevel } from "@/constants/germanTensePatterns";
import type { TenseTabTheme } from "@/lib/tenses/theme";
import type { UseGermanTensesReturn } from "@/hooks/useGermanTenses";
import { VerbBracketView } from "./VerbBracketView";

interface TensesPatternsTabProps {
  theme: TenseTabTheme;
  tenses: UseGermanTensesReturn;
  onSpeak: (text: string) => Promise<void>;
}

type PatternView = "timeline" | "structure";

export function TensesPatternsTab({ theme, tenses, onSpeak }: TensesPatternsTabProps) {
  const [view, setView] = useState<PatternView>("timeline");
  const [verbId, setVerbId] = useState<VerbId>("machen");
  const [tenseId, setTenseId] = useState<BuildTenseId>("praes");
  const [subjectId, setSubjectId] = useState<SubjectId>("ich");
  const [patternTense, setPatternTense] = useState<BuildTenseId>("praes");

  const verbs = useMemo(() => verbsForLevel(tenses.level), [tenses.level]);
  const timelineTenses = useMemo(() => buildTensesForLevel(tenses.level), [tenses.level]);
  const patternInfo = useMemo(() => patternsForLevel(tenses.level), [tenses.level]);
  const activePattern = patternInfo.find(p => p.id === patternTense) ?? patternInfo[0];

  useEffect(() => {
    tenses.recordTimelineView();
  }, [tenseId, tenses]);

  useEffect(() => {
    if (verbs.length && !verbs.find(v => v.id === verbId)) setVerbId(verbs[0]!.id);
  }, [verbs, verbId]);

  useEffect(() => {
    if (!timelineTenses.find(t => t.id === tenseId)) setTenseId(timelineTenses[0]!.id);
  }, [timelineTenses, tenseId]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["timeline", "structure"] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 10,
              border: view === v ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
              background: view === v ? theme.tbg : "#fff",
              color: view === v ? theme.tc : "var(--text-muted)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {v === "timeline" ? "Zeitstraße" : "Klammer"}
          </button>
        ))}
      </div>

      {view === "timeline" && (
        <TenseTimeline
          level={tenses.level}
          verbId={verbId}
          tenseId={tenseId}
          subjectId={subjectId}
          onVerbChange={setVerbId}
          onTenseChange={setTenseId}
          onSubjectChange={setSubjectId}
          hideVerbPicker
          hideSubjectRow
          onSpeak={(text, lang) => void onSpeak(text)}
          compact
        />
      )}

      {view === "timeline" && (
      <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {verbs.slice(0, 8).map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVerbId(v.id)}
            style={{
              minHeight: 34,
              padding: "4px 10px",
              borderRadius: 999,
              border: verbId === v.id ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
              background: verbId === v.id ? theme.tbg : "#fff",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {v.emoji} {v.infinitive}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {SUBJECTS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSubjectId(s.id)}
            style={{
              minWidth: 34,
              minHeight: 34,
              borderRadius: 8,
              border: subjectId === s.id ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
              background: subjectId === s.id ? theme.tbg : "#fff",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      </>
      )}

      {view === "structure" && (
        <VerbBracketView theme={theme} verbId={verbId} tenseId={tenseId} subjectId={subjectId} />
      )}

      <p style={{ fontSize: 12, fontWeight: 700, color: theme.tc, margin: "16px 0 8px" }}>Tense guide</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {patternInfo.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPatternTense(p.id as BuildTenseId);
              if (timelineTenses.find(t => t.id === p.id)) setTenseId(p.id as BuildTenseId);
            }}
            style={{
              minHeight: 34,
              padding: "4px 10px",
              borderRadius: 8,
              border: patternTense === p.id ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
              background: patternTense === p.id ? theme.tbg : "#fff",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activePattern && (
        <div className="ui-card" style={{ padding: 14, border: `1px solid ${theme.tbd}` }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: theme.tc, margin: "0 0 6px" }}>{activePattern.formula}</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
            {activePattern.whenToUse}
          </p>
          {activePattern.examples.map(ex => (
            <div
              key={ex.de}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: theme.tbg,
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 14 }}>{ex.de}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: theme.tmid }}>{ex.en}</p>
              </div>
              <button
                type="button"
                aria-label="Vorlesen"
                onClick={() => void onSpeak(ex.de)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${theme.tbd}`,
                  background: "#fff",
                  cursor: "pointer",
                  color: theme.tc,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Volume2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
