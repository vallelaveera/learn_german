"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import {
  bracketParts,
  buildPiecePool,
  buildTensesForLevel,
  verbsForLevel,
  type BuildTenseId,
  type BuildPiece,
  type SubjectId,
  type VerbId,
} from "@/constants/germanTenses";
import { SUBJECTS } from "@/constants/germanTenses";
import type { TenseTabTheme } from "@/lib/tenses/theme";
import type { UseGermanTensesReturn } from "@/hooks/useGermanTenses";
import { VerbBracketView } from "./VerbBracketView";
import { TenseTimeline } from "@/components/TenseTimeline";
import { TenseVerbPickers } from "./TenseVerbPickers";

interface TensesBuildTabProps {
  theme: TenseTabTheme;
  tenses: UseGermanTensesReturn;
  onSpeak: (text: string) => Promise<void>;
  speaking?: boolean;
}

export function TensesBuildTab({ theme, tenses, onSpeak, speaking = false }: TensesBuildTabProps) {
  const verbs = useMemo(() => verbsForLevel(tenses.level), [tenses.level]);
  const tenseOptions = useMemo(() => buildTensesForLevel(tenses.level), [tenses.level]);
  const [verbId, setVerbId] = useState<VerbId>("gehen");
  const [tenseId, setTenseId] = useState<BuildTenseId>("perf");
  const [subjectId, setSubjectId] = useState<SubjectId>("ich");
  const [v2Slot, setV2Slot] = useState<string | null>(null);
  const [endSlot, setEndSlot] = useState<string | null>(null);
  const [pieces, setPieces] = useState<BuildPiece[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bracketClosed, setBracketClosed] = useState(false);
  const v2Ref = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const target = useMemo(() => bracketParts(verbId, tenseId, subjectId), [verbId, tenseId, subjectId]);

  const resetPieces = useCallback(() => {
    setPieces(buildPiecePool(verbId, tenseId, subjectId));
    setV2Slot(null);
    setEndSlot(null);
    setFeedback(null);
    setBracketClosed(false);
  }, [verbId, tenseId, subjectId]);

  useEffect(() => {
    resetPieces();
  }, [resetPieces]);

  useEffect(() => {
    if (verbs.length && !verbs.find(v => v.id === verbId)) {
      setVerbId(verbs[0]!.id);
    }
  }, [verbs, verbId]);

  const usedTexts = new Set([v2Slot, endSlot].filter(Boolean));
  const shelf = pieces.filter(p => !usedTexts.has(p.text));

  const handleCheck = () => {
    const v2Ok = v2Slot === target.v2;
    const endOk = !target.hasBracket || endSlot === target.end;

    if (v2Ok && endOk) {
      tenses.recordAnswer(tenseId, tenses.level, true, { klammerPerfect: true });
      tenses.addXp(30);
      setBracketClosed(true);
      setFeedback(null);
      void onSpeak(target.full);
      return;
    }

    if (!v2Ok && (tenseId === "perf" || tenseId === "plusqu")) {
      const verb = verbs.find(v => v.id === verbId);
      if (verb?.usesSein && v2Slot && ["habe", "hast", "hat", "haben", "habt", "hatte", "hattest", "hatten", "hattet"].includes(v2Slot)) {
        setFeedback("gehen uses sein — try bin/bist/ist/war… not haben.");
        tenses.recordAnswer(tenseId, tenses.level, false);
        return;
      }
      if (verb && !verb.usesSein && v2Slot && ["bin", "bist", "ist", "sind", "seid", "war", "warst", "waren", "wart"].includes(v2Slot)) {
        setFeedback("This verb uses haben, not sein.");
        tenses.recordAnswer(tenseId, tenses.level, false);
        return;
      }
    }

    setFeedback("Check position 2 and the clause-end piece.");
    tenses.recordAnswer(tenseId, tenses.level, false);
  };

  return (
    <div>
      <TenseTimeline
        level={tenses.level}
        verbId={verbId}
        tenseId={tenseId}
        subjectId={subjectId}
        onTenseChange={setTenseId}
        hideVerbPicker
        hideTensePicker
        hideSubjectRow
        hideSentence
        compact
      />

      <TenseVerbPickers
        theme={theme}
        tenses={tenseOptions}
        verbs={verbs}
        tenseId={tenseId}
        verbId={verbId}
        onTenseChange={setTenseId}
        onVerbChange={setVerbId}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
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

      <VerbBracketView theme={theme} verbId={verbId} tenseId={tenseId} subjectId={subjectId} closed={bracketClosed} />

      <div className="ui-card" style={{ padding: 14, marginBottom: 12, border: `1px solid ${theme.tbd}`, lineHeight: 2 }}>
        <span style={{ fontWeight: 700 }}>{SUBJECTS.find(s => s.id === subjectId)!.start}</span>
        {" "}
        <span
          ref={v2Ref}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            setV2Slot(e.dataTransfer.getData("text/plain"));
          }}
          style={{
            display: "inline-block",
            minWidth: 72,
            minHeight: 36,
            padding: "4px 10px",
            borderRadius: 8,
            border: `2px dashed ${theme.tc}`,
            background: v2Slot ? theme.tbg : "#fff",
            fontWeight: 800,
            color: theme.tc,
            verticalAlign: "middle",
          }}
        >
          {v2Slot ?? "Pos. 2"}
        </span>
        {target.middle && <span> {target.middle.trim()}</span>}
        {target.hasBracket && (
          <>
            {" "}
            <span
              ref={endRef}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                setEndSlot(e.dataTransfer.getData("text/plain"));
              }}
              style={{
                display: "inline-block",
                minWidth: 88,
                minHeight: 36,
                padding: "4px 10px",
                borderRadius: 8,
                border: `2px dashed ${theme.tc}`,
                background: endSlot ? theme.tbg : "#fff",
                fontWeight: 800,
                color: theme.tc,
                verticalAlign: "middle",
              }}
            >
              {endSlot ?? "Ende"}
            </span>
          </>
        )}
      </div>

      {feedback && (
        <p style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>{feedback}</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {shelf.map(p => (
          <div
            key={p.id}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData("text/plain", p.text);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => {
              if (!v2Slot) setV2Slot(p.text);
              else if (target.hasBracket && !endSlot) setEndSlot(p.text);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${theme.tbd}`,
              background: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "grab",
              touchAction: "none",
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleCheck}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: 12,
            border: "none",
            background: theme.tc,
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Prüfen
        </button>
        <button
          type="button"
          onClick={() => void onSpeak(target.full)}
          disabled={speaking}
          style={{
            minWidth: 44,
            minHeight: 44,
            borderRadius: 12,
            border: `1px solid ${theme.tbd}`,
            background: "#fff",
            cursor: speaking ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.tc,
          }}
        >
          {speaking ? <Loader2 size={18} className="spin" /> : <Volume2 size={18} />}
        </button>
        <button
          type="button"
          onClick={resetPieces}
          style={{
            minHeight: 44,
            padding: "0 14px",
            borderRadius: 12,
            border: `1px solid ${theme.tbd}`,
            background: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
