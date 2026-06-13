"use client";

import { useCallback, useMemo, useState } from "react";
import { pickNouns } from "@/lib/cases/germanCaseNouns";
import { portalsForLevel } from "@/lib/cases/germanCasePatterns";
import { definiteArticle } from "@/lib/cases/declension";
import type { CaseKey } from "@/lib/cases/types";
import { CASE_COLORS, CASE_LABEL } from "@/lib/cases/theme";
import type { CaseTabTheme } from "@/lib/cases/theme";
import type { UseGermanCasesReturn } from "@/hooks/useGermanCases";
import type { CaseId } from "@/lib/articles/types";

interface CasesPortalsTabProps {
  theme: CaseTabTheme;
  cases: UseGermanCasesReturn;
}

type WechselMode = "motion" | "location" | null;

export function CasesPortalsTab({ theme, cases }: CasesPortalsTabProps) {
  const portals = useMemo(() => portalsForLevel(cases.level), [cases.level]);
  const [portalIdx, setPortalIdx] = useState(0);
  const [prepIdx, setPrepIdx] = useState(0);
  const [noun, setNoun] = useState(() => pickNouns(1, cases.level)[0]!);
  const [wechselMode, setWechselMode] = useState<WechselMode>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [roundTotal, setRoundTotal] = useState(0);
  const [portalStreak, setPortalStreak] = useState(0);
  const [portalHadWrong, setPortalHadWrong] = useState(false);
  const [portalBonusMsg, setPortalBonusMsg] = useState<string | null>(null);

  const portal = portals[portalIdx % portals.length]!;
  const preposition = portal.prepositions[prepIdx % portal.prepositions.length]!;

  const expectedCase = useCallback((): CaseId => {
    if (portal.caseKey === "wechsel") {
      return wechselMode === "motion" ? "akk" : "dat";
    }
    if (portal.caseKey === "akk") return "akk";
    if (portal.caseKey === "dat") return "dat";
    return "gen";
  }, [portal, wechselMode]);

  const articleChoices = useMemo(() => {
    return [
      definiteArticle(noun.gender, "nom"),
      definiteArticle(noun.gender, "akk"),
      definiteArticle(noun.gender, "dat"),
      definiteArticle(noun.gender, "gen"),
    ].filter((v, i, arr) => arr.indexOf(v) === i);
  }, [noun]);

  const finishPortalRound = useCallback(
    (streakAfterLast: number, hadWrong: boolean) => {
      if (!hadWrong && streakAfterLast >= portal.prepositions.length) {
        cases.recordPortalPerfect();
        cases.addXp(20);
        setPortalBonusMsg(`Perfect ${portal.acronym ?? portal.label} round! +20 bonus XP`);
        window.setTimeout(() => setPortalBonusMsg(null), 2500);
      }
      setPortalStreak(0);
      setPortalHadWrong(false);
    },
    [cases, portal.acronym, portal.label, portal.prepositions.length],
  );

  const advanceQuestion = useCallback(
    (wasCorrect: boolean, streakAfter: number, hadWrong: boolean) => {
      setWechselMode(null);
      setFlash(null);
      setNoun(pickNouns(1, cases.level)[0]!);

      const nextPrep = prepIdx + 1;
      if (nextPrep >= portal.prepositions.length) {
        finishPortalRound(streakAfter, hadWrong);
        setPortalIdx(p => (p + 1) % portals.length);
        setPrepIdx(0);
        return;
      }
      setPrepIdx(nextPrep);
    },
    [cases.level, finishPortalRound, portal.prepositions.length, portals.length, prepIdx],
  );

  const handlePickArticle = (art: string) => {
    if (portal.caseKey === "wechsel" && !wechselMode) return;
    const correct = art === definiteArticle(noun.gender, expectedCase());
    setRoundTotal(t => t + 1);

    if (correct) {
      const nextStreak = portalStreak + 1;
      setPortalStreak(nextStreak);
      setRoundCorrect(c => c + 1);
      cases.addXp(10);
      cases.recordAnswer(portal.caseKey === "wechsel" ? "wechsel" : portal.caseKey, cases.level, true, {
        wechsel: portal.caseKey === "wechsel",
        genitive: portal.caseKey === "gen",
      });
      setFlash("correct");
      window.setTimeout(() => {
        advanceQuestion(true, nextStreak, portalHadWrong);
      }, 900);
    } else {
      setPortalHadWrong(true);
      setPortalStreak(0);
      cases.recordAnswer(portal.caseKey === "wechsel" ? "wechsel" : portal.caseKey, cases.level, false);
      setFlash("wrong");
      window.setTimeout(() => {
        advanceQuestion(false, 0, true);
      }, 900);
    }
  };

  const caseColor =
    portal.caseKey === "wechsel"
      ? CASE_COLORS.wechsel
      : CASE_COLORS[portal.caseKey as Exclude<CaseKey, "wechsel">];

  return (
    <div>
      <p style={{ fontSize: 12, color: theme.tmid, margin: "0 0 12px", lineHeight: 1.5 }}>
        {portal.label} — wähle den richtigen Artikel nach der Präposition. +10 XP · +20 bonus bei perfekter
        Portal-Runde.
      </p>

      {portalBonusMsg && (
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: theme.tc,
            margin: "0 0 10px",
            padding: "10px 12px",
            borderRadius: 10,
            background: theme.tbg,
            border: `1px solid ${theme.tbd}`,
          }}
        >
          {portalBonusMsg}
        </p>
      )}

      <div
        className="ui-card"
        style={{
          padding: 16,
          marginBottom: 14,
          border: `2px solid ${caseColor}`,
          background: `${caseColor}10`,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: theme.tmid, margin: "0 0 4px" }}>
          {portal.acronym ?? portal.label} · {prepIdx + 1}/{portal.prepositions.length}
        </p>
        <p style={{ fontSize: 28, fontWeight: 900, color: caseColor, margin: "0 0 8px" }}>
          {preposition}
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
          {preposition} ___ {noun.word}
        </p>
        <p style={{ fontSize: 12, color: theme.tmid, margin: "8px 0 0" }}>{portal.hint}</p>
      </div>

      {portal.caseKey === "wechsel" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setWechselMode("motion")}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              border: `2px solid ${CASE_COLORS.akk}`,
              background: wechselMode === "motion" ? `${CASE_COLORS.akk}18` : "#fff",
              color: CASE_COLORS.akk,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            wohin? → Akk
          </button>
          <button
            type="button"
            onClick={() => setWechselMode("location")}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              border: `2px solid ${CASE_COLORS.dat}`,
              background: wechselMode === "location" ? `${CASE_COLORS.dat}18` : "#fff",
              color: CASE_COLORS.dat,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            wo? → Dat
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
          opacity: portal.caseKey === "wechsel" && !wechselMode ? 0.45 : 1,
        }}
      >
        {articleChoices.map(art => (
          <button
            key={art}
            type="button"
            onClick={() => handlePickArticle(art)}
            disabled={portal.caseKey === "wechsel" && !wechselMode}
            style={{
              minHeight: 48,
              borderRadius: 12,
              border:
                flash === "wrong"
                  ? "2px solid var(--red)"
                  : flash === "correct"
                    ? "2px solid var(--green)"
                    : `1.5px solid ${theme.tbd}`,
              background: "#fff",
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {art}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: theme.tmid, textAlign: "center", margin: 0 }}>
        Session: {roundCorrect}/{roundTotal} · Portal streak: {portalStreak}/{portal.prepositions.length}
      </p>
    </div>
  );
}
