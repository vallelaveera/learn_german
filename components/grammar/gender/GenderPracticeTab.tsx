"use client";

import { useEffect, useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { getPatternForRound, patternFullSentence } from "@/lib/gender/germanPatterns";
import { pickRandomNouns } from "@/lib/gender/germanNouns";
import type { GenderNoun } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";
import type { GenderTabTheme } from "@/lib/gender/theme";
import type { UseGermanGenderReturn } from "@/hooks/useGermanGender";

interface GenderPracticeTabProps {
  theme: GenderTabTheme;
  gender: UseGermanGenderReturn;
  onSpeak: (text: string) => void;
}

type Phase = 1 | 2;

function shuffleWords(words: string[]): string[] {
  const copy = words.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function GenderPracticeTab({ theme, gender, onSpeak }: GenderPracticeTabProps) {
  const pattern = useMemo(() => getPatternForRound(gender.roundNum), [gender.roundNum]);
  const fullSentence = useMemo(() => patternFullSentence(pattern), [pattern]);

  const [phase, setPhase] = useState<Phase>(gender.graduated ? 2 : 1);
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null);
  const [fills, setFills] = useState<(string | null)[]>(() => pattern.keys.map(() => null));
  const [pool, setPool] = useState<string[]>(() => shuffleWords(pattern.keys));
  const [checkState, setCheckState] = useState<"idle" | "correct" | "wrong">("idle");

  const [dragWords, setDragWords] = useState<GenderNoun[]>(() => pickRandomNouns(6));
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [zones, setZones] = useState<Record<string, "der" | "die" | "das" | null>>({});
  const [dragChecked, setDragChecked] = useState(false);
  const [dragResults, setDragResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (gender.graduated) setPhase(2);
  }, [gender.graduated]);

  const accuracyPct =
    gender.sentenceTotal > 0
      ? Math.round((gender.sentenceCorrect / gender.sentenceTotal) * 100)
      : 0;

  const resetPhase1 = () => {
    setSelectedBlank(null);
    setFills(pattern.keys.map(() => null));
    setPool(shuffleWords(pattern.keys));
    setCheckState("idle");
  };

  const startPhase2 = () => {
    const words = pickRandomNouns(6);
    setDragWords(words);
    setSelectedWord(null);
    setZones(Object.fromEntries(words.map(w => [w.id, null])));
    setDragChecked(false);
    setDragResults({});
    setPhase(2);
  };

  const startNextRound = (skipWarmup: boolean) => {
    const nextRound = gender.roundNum + 1;
    gender.advanceRound();
    const nextPattern = getPatternForRound(nextRound);
    setFills(nextPattern.keys.map(() => null));
    setPool(shuffleWords(nextPattern.keys));
    setSelectedBlank(null);
    setCheckState("idle");
    if (gender.graduated || skipWarmup) {
      setPhase(2);
      const words = pickRandomNouns(6);
      setDragWords(words);
      setZones(Object.fromEntries(words.map(w => [w.id, null])));
      setDragChecked(false);
      setDragResults({});
    } else {
      setPhase(1);
    }
  };

  const handleBlankTap = (idx: number) => {
    if (checkState !== "idle") return;
    const word = fills[idx];
    if (word) {
      setFills(prev => {
        const next = [...prev];
        next[idx] = null;
        return next;
      });
      setPool(prev => [...prev, word]);
      setSelectedBlank(idx);
      return;
    }
    setSelectedBlank(prev => (prev === idx ? null : idx));
  };

  const handleWordTap = (word: string) => {
    if (checkState !== "idle" || selectedBlank === null) return;
    if (!pool.includes(word)) return;
    setFills(prev => {
      const next = [...prev];
      next[selectedBlank] = word;
      return next;
    });
    setPool(prev => prev.filter(w => w !== word));
    setSelectedBlank(null);
  };

  const handleCheckPhase1 = () => {
    if (fills.some(f => !f)) return;
    const allCorrect = fills.every((f, i) => f === pattern.keys[i]);
    gender.recordSentenceAttempt(allCorrect);
    if (allCorrect) {
      gender.addXp(20);
      setCheckState("correct");
      window.setTimeout(() => startPhase2(), 950);
    } else {
      setCheckState("wrong");
      window.setTimeout(() => resetPhase1(), 1300);
    }
  };

  const handleZoneTap = (article: "der" | "die" | "das") => {
    if (dragChecked || !selectedWord) return;
    setZones(prev => ({ ...prev, [selectedWord]: article }));
    setSelectedWord(null);
  };

  const handleWordSelect = (id: string) => {
    if (dragChecked) return;
    setSelectedWord(prev => (prev === id ? null : id));
  };

  const handleCheckPhase2 = () => {
    const results: Record<string, boolean> = {};
    let perfect = true;
    for (const w of dragWords) {
      const chosen = zones[w.id];
      const ok = chosen === w.article;
      results[w.id] = ok;
      if (!ok) perfect = false;
    }
    setDragResults(results);
    setDragChecked(true);
    gender.recordDragDropResult(
      dragWords.map(w => ({ article: w.article, correct: results[w.id] ?? false })),
    );
    if (perfect) {
      gender.addXp(50);
      window.setTimeout(() => startNextRound(false), 1200);
    }
  };

  const unassigned = dragWords.filter(w => !zones[w.id]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: theme.tmid,
          }}
        >
          Round {gender.roundNum} · {pattern.article}
        </span>
        <button
          type="button"
          onClick={() => onSpeak(fullSentence)}
          aria-label="Maya reads sentence"
          style={{
            minWidth: 44,
            minHeight: 44,
            borderRadius: 12,
            border: `1.5px solid ${theme.tbd}`,
            background: theme.tbg,
            color: theme.tc,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Volume2 size={18} />
        </button>
      </div>

      {!gender.graduated && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.tmid, marginBottom: 4 }}>
            <span>Sentence accuracy</span>
            <span>{accuracyPct}%</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: theme.tbg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${accuracyPct}%`,
                background: theme.tc,
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {phase === 1 && (
        <>
          <p style={{ fontSize: 12, color: theme.tmid, margin: "0 0 10px" }}>
            Phase 1 — Fill the rule-words into the sentence
          </p>
          <div
            className="ui-card"
            style={{
              padding: "14px 12px",
              marginBottom: 12,
              lineHeight: 1.65,
              fontSize: 14,
              border: `1.5px solid ${theme.tbd}`,
            }}
          >
            {pattern.keys.map((_, idx) => (
              <span key={idx}>
                {pattern.frameParts[idx]}
                <button
                  type="button"
                  onClick={() => handleBlankTap(idx)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: fills[idx] ? "auto" : 56,
                    minHeight: 32,
                    padding: fills[idx] ? "2px 10px" : "2px 8px",
                    margin: "0 2px",
                    borderRadius: 8,
                    border:
                      checkState === "wrong" && fills[idx] !== pattern.keys[idx]
                        ? "2px solid var(--red)"
                        : checkState === "correct"
                          ? "2px solid var(--green)"
                          : selectedBlank === idx
                            ? `2px solid ${theme.tc}`
                            : `1.5px dashed ${theme.tmid}`,
                    background:
                      checkState === "correct"
                        ? "rgba(56, 161, 105, 0.15)"
                        : selectedBlank === idx
                          ? theme.tbg
                          : "rgba(255,255,255,0.7)",
                    color: fills[idx] ? theme.tc : theme.tmid,
                    fontWeight: fills[idx] ? 700 : 500,
                    fontSize: 13,
                    cursor: checkState === "idle" ? "pointer" : "default",
                    verticalAlign: "middle",
                  }}
                >
                  {fills[idx] ?? "___"}
                </button>
              </span>
            ))}
            {pattern.frameParts[pattern.keys.length]}
          </div>

          {selectedBlank !== null && (
            <p
              style={{
                fontSize: 12,
                color: theme.tc,
                fontWeight: 600,
                margin: "0 0 10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {pattern.hints[selectedBlank]}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {pool.map(word => (
              <button
                key={word}
                type="button"
                onClick={() => handleWordTap(word)}
                disabled={selectedBlank === null || checkState !== "idle"}
                style={{
                  minHeight: 44,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1.5px solid ${theme.tbd}`,
                  background: "#fff",
                  color: theme.tc,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: selectedBlank !== null && checkState === "idle" ? "pointer" : "default",
                  opacity: selectedBlank !== null ? 1 : 0.55,
                }}
              >
                {word}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCheckPhase1}
            disabled={fills.some(f => !f) || checkState !== "idle"}
            style={{
              width: "100%",
              minHeight: 48,
              borderRadius: 14,
              border: "none",
              background: fills.every(Boolean) && checkState === "idle" ? theme.tc : theme.tbg,
              color: fills.every(Boolean) && checkState === "idle" ? "#fff" : theme.tmid,
              fontWeight: 700,
              fontSize: 14,
              cursor: fills.every(Boolean) && checkState === "idle" ? "pointer" : "default",
            }}
          >
            Check sentence
          </button>
        </>
      )}

      {phase === 2 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: theme.tmid, margin: 0 }}>
              Phase 2 — Sort words by article
            </p>
            <button
              type="button"
              onClick={() => startNextRound(gender.graduated)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.tc,
                background: "transparent",
                border: "none",
                minHeight: 44,
                padding: "0 8px",
                cursor: "pointer",
              }}
            >
              Skip →
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {unassigned.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleWordSelect(w.id)}
                style={{
                  minHeight: 44,
                  padding: "8px 12px",
                  borderRadius: 12,
                  border:
                    selectedWord === w.id
                      ? `2px solid ${theme.tc}`
                      : dragChecked
                        ? `2px solid ${dragResults[w.id] ? "var(--green)" : "var(--red)"}`
                        : `1.5px solid ${theme.tbd}`,
                  background: selectedWord === w.id ? theme.tbg : "#fff",
                  cursor: dragChecked ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span>{w.emoji}</span>
                <span>{w.word}</span>
              </button>
            ))}
          </div>

          {(["der", "die", "das"] as const).map(article => (
            <div key={article} style={{ marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => handleZoneTap(article)}
                style={{
                  width: "100%",
                  minHeight: 52,
                  borderRadius: 12,
                  border: `2px solid ${GENDER_ARTICLE_COLORS[article]}`,
                  background: `${GENDER_ARTICLE_COLORS[article]}14`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  cursor: dragChecked ? "default" : "pointer",
                }}
              >
                <span style={{ fontWeight: 800, color: GENDER_ARTICLE_COLORS[article], fontSize: 16 }}>
                  {article}
                </span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                  {dragWords
                    .filter(w => zones[w.id] === article)
                    .map(w => (
                      <span
                        key={w.id}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: 8,
                          background: "#fff",
                          border: dragChecked
                            ? `1.5px solid ${dragResults[w.id] ? "var(--green)" : "var(--red)"}`
                            : "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        {w.emoji} {w.word}
                      </span>
                    ))}
                </span>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleCheckPhase2}
            disabled={unassigned.length > 0 || dragChecked}
            style={{
              width: "100%",
              minHeight: 48,
              borderRadius: 14,
              border: "none",
              marginTop: 8,
              background: unassigned.length === 0 && !dragChecked ? theme.tc : theme.tbg,
              color: unassigned.length === 0 && !dragChecked ? "#fff" : theme.tmid,
              fontWeight: 700,
              fontSize: 14,
              cursor: unassigned.length === 0 && !dragChecked ? "pointer" : "default",
            }}
          >
            Check sorting
          </button>

          {dragChecked && (
            <button
              type="button"
              onClick={() => startNextRound(false)}
              style={{
                width: "100%",
                minHeight: 44,
                marginTop: 10,
                borderRadius: 14,
                border: `1.5px solid ${theme.tbd}`,
                background: "transparent",
                color: theme.tc,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Next round
            </button>
          )}
        </>
      )}
    </div>
  );
}
