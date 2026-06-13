"use client";

import { useMemo, useState } from "react";
import {
  AUX_SORT_ITEMS,
  PARTIZIP_RULES,
  WORKSHOP_PARTICIPIA,
  expectedAux,
  validatePartizipGuess,
} from "@/constants/germanTensePatterns";
import type { TenseTabTheme } from "@/lib/tenses/theme";
import type { UseGermanTensesReturn } from "@/hooks/useGermanTenses";

interface TensesWorkshopTabProps {
  theme: TenseTabTheme;
  tenses: UseGermanTensesReturn;
}

type WorkshopMode = "partizip" | "aux";

export function TensesWorkshopTab({ theme, tenses }: TensesWorkshopTabProps) {
  const [mode, setMode] = useState<WorkshopMode>("partizip");
  const [pIdx, setPIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [pFeedback, setPFeedback] = useState<string | null>(null);
  const [auxIdx, setAuxIdx] = useState(0);
  const [auxFeedback, setAuxFeedback] = useState<string | null>(null);
  const [auxScore, setAuxScore] = useState({ correct: 0, total: 0 });

  const target = WORKSHOP_PARTICIPIA[pIdx % WORKSHOP_PARTICIPIA.length]!;
  const rule = PARTIZIP_RULES.find(r => r.id === target.partType)!;
  const auxItem = AUX_SORT_ITEMS[auxIdx % AUX_SORT_ITEMS.length]!;
  const expected = useMemo(() => expectedAux(auxItem.infinitive), [auxItem]);

  const checkPartizip = () => {
    if (validatePartizipGuess(target.infinitive, guess)) {
      tenses.recordPartizipHit();
      tenses.addXp(15);
      setPFeedback(`✓ ${target.expected} — ${rule.label}`);
      setTimeout(() => {
        setPIdx(i => i + 1);
        setGuess("");
        setPFeedback(null);
      }, 900);
    } else {
      setPFeedback(`Not quite — hint: ${rule.formula}`);
    }
  };

  const pickAux = (choice: "haben" | "sein") => {
    const ok = choice === expected;
    setAuxScore(s => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
    if (ok) {
      tenses.recordAuxHit();
      tenses.addXp(10);
      setAuxFeedback(`✓ ${auxItem.infinitive} → ${choice}`);
    } else {
      setAuxFeedback(`${auxItem.infinitive} → ${expected}. ${expected === "sein" ? "Motion/change-of-state." : "Default auxiliary."}`);
    }
    setTimeout(() => {
      setAuxIdx(i => i + 1);
      setAuxFeedback(null);
    }, 1200);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["partizip", "aux"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 10,
              border: mode === m ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
              background: mode === m ? theme.tbg : "#fff",
              color: mode === m ? theme.tc : "var(--text-muted)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {m === "partizip" ? "Partizip II" : "haben / sein"}
          </button>
        ))}
      </div>

      {mode === "partizip" && (
        <>
          <div className="ui-card" style={{ padding: 14, marginBottom: 12, border: `1px solid ${theme.tbd}` }}>
            <p style={{ fontSize: 11, color: theme.tmid, margin: "0 0 6px" }}>{rule.label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: theme.tc, margin: "0 0 4px" }}>{rule.formula}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{rule.hint}</p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>
            {target.infinitive} → ?
          </p>
          <input
            value={guess}
            onChange={e => setGuess(e.target.value)}
            placeholder="Partizip II eingeben…"
            style={{
              width: "100%",
              minHeight: 44,
              borderRadius: 10,
              border: `1.5px solid ${theme.tbd}`,
              padding: "0 12px",
              fontSize: 16,
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />
          {pFeedback && (
            <p style={{ fontSize: 13, fontWeight: 600, color: pFeedback.startsWith("✓") ? theme.tc : "var(--red)", margin: "0 0 10px" }}>
              {pFeedback}
            </p>
          )}
          <button
            type="button"
            onClick={checkPartizip}
            style={{
              width: "100%",
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
        </>
      )}

      {mode === "aux" && (
        <>
          <p style={{ fontSize: 12, color: theme.tmid, margin: "0 0 12px" }}>
            Score: {auxScore.correct}/{auxScore.total}
          </p>
          <div className="ui-card" style={{ padding: 20, marginBottom: 14, textAlign: "center", border: `1px solid ${theme.tbd}` }}>
            <span style={{ fontSize: 32 }}>{auxItem.emoji}</span>
            <p style={{ fontSize: 18, fontWeight: 800, color: theme.tc, margin: "8px 0 4px" }}>{auxItem.infinitive}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{auxItem.en}</p>
          </div>
          {auxFeedback && (
            <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px", color: auxFeedback.startsWith("✓") ? theme.tc : "var(--red)" }}>
              {auxFeedback}
            </p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {(["haben", "sein"] as const).map(choice => (
              <button
                key={choice}
                type="button"
                onClick={() => pickAux(choice)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 12,
                  border: `2px solid ${theme.tbd}`,
                  background: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  color: theme.tc,
                }}
              >
                {choice}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
