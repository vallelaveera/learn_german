"use client";

import { useCallback, useMemo, useState } from "react";
import { pickSortRoundWords } from "@/lib/gender/germanNouns";
import type { GenderArticle, GenderNoun } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";
import type { GenderTabTheme } from "@/lib/gender/theme";
import type { UseGermanGenderReturn } from "@/hooks/useGermanGender";
import { GenderArticleTabs } from "./GenderArticleTabs";

interface GenderSortTabProps {
  theme: GenderTabTheme;
  gender: UseGermanGenderReturn;
}

const ARTICLE_STEPS: GenderArticle[] = ["der", "die", "das"];

type PickFeedback = "correct" | "wrong";

export function GenderSortTab({ theme, gender }: GenderSortTabProps) {
  const [words, setWords] = useState<GenderNoun[]>(() => pickSortRoundWords());
  const [stepIdx, setStepIdx] = useState(0);
  const [locked, setLocked] = useState<Record<string, GenderArticle>>({});
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [bucketChecked, setBucketChecked] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, PickFeedback>>({});
  const [roundComplete, setRoundComplete] = useState(false);

  const activeArticle = ARTICLE_STEPS[stepIdx]!;
  const activeColor = GENDER_ARTICLE_COLORS[activeArticle];

  const available = useMemo(
    () => words.filter(w => !locked[w.id]),
    [words, locked],
  );

  const restart = useCallback(() => {
    setWords(pickSortRoundWords());
    setStepIdx(0);
    setLocked({});
    setPicked(new Set());
    setBucketChecked(false);
    setFeedback({});
    setRoundComplete(false);
  }, []);

  const togglePick = (id: string) => {
    if (bucketChecked || locked[id]) return;
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCheckBucket = () => {
    if (picked.size === 0) return;

    const nextFeedback: Record<string, PickFeedback> = {};
    const nextLocked = { ...locked };
    let correctCount = 0;

    for (const id of Array.from(picked)) {
      const word = words.find(w => w.id === id);
      if (!word) continue;
      if (word.article === activeArticle) {
        nextFeedback[id] = "correct";
        nextLocked[id] = activeArticle;
        correctCount += 1;
        gender.recordSortResult(true, id, activeArticle);
      } else {
        nextFeedback[id] = "wrong";
        gender.recordSortResult(false, id, activeArticle);
      }
    }

    if (correctCount > 0) {
      gender.addXp(correctCount * 10);
    }

    setFeedback(nextFeedback);
    setLocked(nextLocked);
    setBucketChecked(true);
  };

  const handleNextStep = () => {
    if (stepIdx >= ARTICLE_STEPS.length - 1) {
      gender.addXp(20);
      setRoundComplete(true);
      return;
    }
    setStepIdx(i => i + 1);
    setPicked(new Set());
    setBucketChecked(false);
    setFeedback({});
  };

  const missedCount = bucketChecked
    ? available.filter(w => w.article === activeArticle && !locked[w.id]).length
    : 0;

  const goToStep = (article: GenderArticle) => {
    const idx = ARTICLE_STEPS.indexOf(article);
    if (idx > stepIdx) return;
    setStepIdx(idx);
    setPicked(new Set());
    setBucketChecked(false);
    setFeedback({});
  };

  return (
    <div>
      <GenderArticleTabs
        value={activeArticle}
        onChange={goToStep}
        inactiveBorder={theme.tbd}
        disabled={ARTICLE_STEPS.slice(stepIdx + 1)}
      />

      <p style={{ fontSize: 12, color: theme.tmid, margin: "0 0 12px", lineHeight: 1.5 }}>
        Schritt {stepIdx + 1}/3 — wähle alle{" "}
        <strong style={{ color: activeColor }}>{activeArticle}</strong>-Wörter, dann prüfen. +10 XP pro
        Treffer.
      </p>

      <div
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          marginBottom: 14,
          border: `2px solid ${activeColor}`,
          background: `${activeColor}12`,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 900, color: activeColor }}>{activeArticle}</span>
        <p style={{ fontSize: 12, color: theme.tmid, margin: "6px 0 0" }}>
          Tippe Wörter an (nochmal tippen = rückgängig)
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {available.map(w => {
          const isPicked = picked.has(w.id);
          const fb = feedback[w.id];
          const isLocked = Boolean(locked[w.id]);

          let border = `1.5px solid ${theme.tbd}`;
          let background = "#fff";
          if (isLocked) {
            border = `2px solid ${GENDER_ARTICLE_COLORS[locked[w.id]!]}`;
            background = `${GENDER_ARTICLE_COLORS[locked[w.id]!]}18`;
          } else if (fb === "correct") {
            border = "2px solid var(--green)";
            background = "rgba(56, 161, 105, 0.12)";
          } else if (fb === "wrong") {
            border = "2px solid var(--red)";
            background = "rgba(224, 90, 74, 0.1)";
          } else if (isPicked) {
            border = `2px solid ${activeColor}`;
            background = `${activeColor}18`;
          }

          return (
            <button
              key={w.id}
              type="button"
              onClick={() => togglePick(w.id)}
              disabled={isLocked || bucketChecked}
              style={{
                minHeight: 56,
                padding: "10px 12px",
                borderRadius: 12,
                border,
                background,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: isLocked || bucketChecked ? "default" : "pointer",
                textAlign: "left",
                opacity: isLocked ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: 20 }}>{w.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{w.word}</span>
            </button>
          );
        })}
      </div>

      {bucketChecked && missedCount > 0 && (
        <p style={{ fontSize: 12, color: "var(--red)", margin: "0 0 10px" }}>
          Noch {missedCount} {activeArticle}-Wort{missedCount === 1 ? "" : "e"} übersehen — weiter bei der
          nächsten Kategorie.
        </p>
      )}

      {!bucketChecked ? (
        <button
          type="button"
          onClick={handleCheckBucket}
          disabled={picked.size === 0}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 14,
            border: "none",
            background: picked.size > 0 ? activeColor : theme.tbg,
            color: picked.size > 0 ? "#fff" : theme.tmid,
            fontWeight: 700,
            fontSize: 14,
            cursor: picked.size > 0 ? "pointer" : "default",
          }}
        >
          {activeArticle} prüfen
        </button>
      ) : (
        <button
          type="button"
          onClick={handleNextStep}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 14,
            border: "none",
            background: theme.tc,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {stepIdx >= ARTICLE_STEPS.length - 1 ? "Runde fertig (+20 XP)" : `Weiter → ${ARTICLE_STEPS[stepIdx + 1]}`}
        </button>
      )}

      {roundComplete && (
        <div
          className="ui-card"
          style={{
            padding: 14,
            marginTop: 12,
            textAlign: "center",
            border: `1.5px solid ${theme.tbd}`,
            background: theme.tbg,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: theme.tc, margin: "0 0 10px" }}>
            Alle 3 Kategorien geschafft!
          </p>
          <button
            type="button"
            onClick={restart}
            style={{
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: theme.tc,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Neue Runde
          </button>
        </div>
      )}
    </div>
  );
}
