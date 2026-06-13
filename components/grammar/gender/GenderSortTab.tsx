"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { pickRandomNouns } from "@/lib/gender/germanNouns";
import type { GenderArticle, GenderNoun } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";
import type { GenderTabTheme } from "@/lib/gender/theme";
import type { UseGermanGenderReturn } from "@/hooks/useGermanGender";

interface GenderSortTabProps {
  theme: GenderTabTheme;
  gender: UseGermanGenderReturn;
}

export function GenderSortTab({ theme, gender }: GenderSortTabProps) {
  const [words, setWords] = useState<GenderNoun[]>(() => pickRandomNouns(9));
  const [selected, setSelected] = useState<string | null>(null);
  const [solved, setSolved] = useState<Record<string, GenderArticle>>({});
  const [flashWrong, setFlashWrong] = useState<string | null>(null);
  const [roundBonus, setRoundBonus] = useState(false);

  const remaining = useMemo(
    () => words.filter(w => !solved[w.id]),
    [words, solved],
  );

  const restart = useCallback(() => {
    setWords(pickRandomNouns(9));
    setSelected(null);
    setSolved({});
    setFlashWrong(null);
    setRoundBonus(false);
  }, []);

  useEffect(() => {
    if (remaining.length === 0 && words.length === 9 && !roundBonus) {
      gender.addXp(20);
      setRoundBonus(true);
    }
  }, [remaining.length, words.length, roundBonus, gender]);

  const handlePickArticle = (article: GenderArticle) => {
    if (!selected || solved[selected]) return;
    const word = words.find(w => w.id === selected);
    if (!word) return;

    if (word.article === article) {
      gender.addXp(10);
      gender.recordSortResult(true, word.id);
      setSolved(prev => ({ ...prev, [word.id]: article }));
      setSelected(null);
    } else {
      gender.recordSortResult(false, word.id);
      setFlashWrong(selected);
      window.setTimeout(() => setFlashWrong(null), 900);
      setSelected(null);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: theme.tmid, margin: "0 0 12px", lineHeight: 1.5 }}>
        Tap a word, then pick der · die · das. +10 XP each · +20 bonus for all 9.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {words.map(w => {
          const done = solved[w.id];
          const isSelected = selected === w.id;
          const color = done ? GENDER_ARTICLE_COLORS[done] : theme.tc;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => !done && setSelected(prev => (prev === w.id ? null : w.id))}
              disabled={Boolean(done)}
              style={{
                minHeight: 56,
                padding: "10px 12px",
                borderRadius: 12,
                border:
                  flashWrong === w.id
                    ? "2px solid var(--red)"
                    : isSelected
                      ? `2px solid ${theme.tc}`
                      : done
                        ? `2px solid ${color}`
                        : `1.5px solid ${theme.tbd}`,
                background: done ? `${color}18` : isSelected ? theme.tbg : "#fff",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: done ? "default" : "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 20 }}>{w.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: done ? color : "var(--text)" }}>
                {w.word}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["der", "die", "das"] as const).map(article => (
          <button
            key={article}
            type="button"
            onClick={() => handlePickArticle(article)}
            disabled={!selected}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 12,
              border: `2px solid ${GENDER_ARTICLE_COLORS[article]}`,
              background: selected ? `${GENDER_ARTICLE_COLORS[article]}20` : "#fff",
              color: GENDER_ARTICLE_COLORS[article],
              fontWeight: 800,
              fontSize: 15,
              opacity: selected ? 1 : 0.45,
              cursor: selected ? "pointer" : "default",
            }}
          >
            {article}
          </button>
        ))}
      </div>

      {remaining.length === 0 && (
        <div
          className="ui-card"
          style={{
            padding: 14,
            marginBottom: 12,
            textAlign: "center",
            border: `1.5px solid ${theme.tbd}`,
            background: theme.tbg,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: theme.tc, margin: "0 0 10px" }}>
            All 9 sorted! +20 bonus XP
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
            New round
          </button>
        </div>
      )}
    </div>
  );
}
