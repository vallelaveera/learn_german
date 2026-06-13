"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import {
  dictForm,
  englishFromPattern,
  explainArticleChange,
  germanSentenceParts,
  phrase,
  roleToCase,
  definiteArticle,
} from "@/lib/cases/declension";
import { pickNouns } from "@/lib/cases/germanCaseNouns";
import { verbsForLevel } from "@/lib/cases/germanVerbs";
import type { CaseKey, CaseNoun, CaseVerb, VerbRole } from "@/lib/cases/types";
import type { CaseId } from "@/lib/articles/types";
import { CASE_COLORS } from "@/lib/cases/theme";
import type { CaseTabTheme } from "@/lib/cases/theme";
import type { UseGermanCasesReturn } from "@/hooks/useGermanCases";

interface CasesBuildTabProps {
  theme: CaseTabTheme;
  cases: UseGermanCasesReturn;
  onSpeak: (text: string) => Promise<void>;
  speaking?: boolean;
}

type BuildMode = "sandbox" | "challenge";
type CheckResult = "idle" | "perfect" | "cases-only" | "wrong";

function roleLabel(role: VerbRole): string {
  if (role === "nom") return "Nom";
  if (role === "dat") return "Dat";
  return "Akk";
}

function roleCaseId(verb: CaseVerb, role: VerbRole): CaseId {
  if (verb.prep && role !== "nom") return verb.prep.case;
  return roleToCase(role);
}

function articleMatchesTarget(placed: CaseNoun, target: CaseNoun, caseId: CaseId): boolean {
  return definiteArticle(placed.gender, caseId) === definiteArticle(target.gender, caseId);
}

export function CasesBuildTab({ theme, cases, onSpeak, speaking = false }: CasesBuildTabProps) {
  const verbs = useMemo(() => verbsForLevel(cases.level), [cases.level]);
  const [verb, setVerb] = useState<CaseVerb>(() => verbs[0]!);
  const [mode, setMode] = useState<BuildMode>("sandbox");
  const [nouns, setNouns] = useState<CaseNoun[]>(() => pickNouns(8, cases.level));
  const [slots, setSlots] = useState<Partial<Record<VerbRole, CaseNoun>>>({});
  const [checked, setChecked] = useState<CheckResult>("idle");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [challengeTargets, setChallengeTargets] = useState<Partial<Record<VerbRole, CaseNoun>>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const slotRefs = useRef<Partial<Record<VerbRole, HTMLDivElement | null>>>({});
  const poolRef = useRef<HTMLDivElement | null>(null);

  const resetChallenge = useCallback(() => {
    const v = verbs[Math.floor(Math.random() * verbs.length)] ?? verbs[0]!;
    setVerb(v);
    const pool = pickNouns(Math.max(8, v.frame.length + 4), cases.level);
    setNouns(pool);
    const targets: Partial<Record<VerbRole, CaseNoun>> = {};
    const used = new Set<string>();
    for (const role of v.frame) {
      const available = pool.filter(n => !used.has(n.id));
      const pick = available[Math.floor(Math.random() * available.length)] ?? pool[0]!;
      targets[role] = pick;
      used.add(pick.id);
    }
    setChallengeTargets(targets);
    setSlots({});
    setChecked("idle");
    setFeedbackMsg(null);
  }, [cases.level, verbs]);

  useEffect(() => {
    if (verbs.length && !verbs.find(v => v.id === verb.id)) {
      setVerb(verbs[0]!);
    }
  }, [verbs, verb.id]);

  const assignedIds = new Set(Object.values(slots).map(n => n?.id));
  const shelf = nouns.filter(n => !assignedIds.has(n.id));

  const slotPhrases = useMemo(() => {
    const out: Partial<Record<VerbRole, string>> = {};
    for (const role of verb.frame) {
      const noun = slots[role];
      if (noun) out[role] = phrase(noun, roleToCase(role));
    }
    return out;
  }, [slots, verb.frame]);

  const germanLine = useMemo(() => {
    if (verb.prep) {
      const obj = slots[verb.frame.find(r => r !== "nom") ?? "akk"];
      const prepPhrase = obj ? phrase(obj, verb.prep.case) : "…";
      return germanSentenceParts(verb.conj3sg, verb.frame, slotPhrases, {
        word: verb.prep.word,
        phrase: prepPhrase,
      });
    }
    return germanSentenceParts(verb.conj3sg, verb.frame, slotPhrases);
  }, [verb, slotPhrases, slots]);

  const englishLine = useMemo(() => {
    const enSlots: Partial<Record<VerbRole, { en: string }>> = {};
    for (const role of verb.frame) {
      const noun = mode === "challenge" ? challengeTargets[role] : slots[role];
      if (noun) enSlots[role] = { en: noun.en };
    }
    return englishFromPattern(verb.enPattern, enSlots);
  }, [verb, slots, challengeTargets, mode]);

  const assignAtPoint = (clientX: number, clientY: number, nounId: string) => {
    const noun = nouns.find(n => n.id === nounId);
    if (!noun) return;

    for (const role of verb.frame) {
      const el = slotRefs.current[role];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        setSlots(prev => {
          const next = { ...prev, [role]: noun };
          return next;
        });
        setChecked("idle");
        setFeedbackMsg(null);
        return;
      }
    }

    const pool = poolRef.current;
    if (pool) {
      const rect = pool.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        setSlots(prev => {
          const next = { ...prev };
          for (const role of verb.frame) {
            if (next[role]?.id === nounId) delete next[role];
          }
          return next;
        });
        setChecked("idle");
      }
    }
  };

  const startPointerDrag = (nounId: string, e: React.PointerEvent) => {
    if (checked === "wrong") return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDraggingId(nounId);
    setGhostPos({ x: e.clientX, y: e.clientY });

    const onMove = (ev: PointerEvent) => setGhostPos({ x: ev.clientX, y: ev.clientY });
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      assignAtPoint(ev.clientX, ev.clientY, nounId);
      setDraggingId(null);
      setGhostPos(null);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const handleCheck = () => {
    if (verb.frame.some(r => !slots[r])) return;
    if (mode === "sandbox") {
      void onSpeak(germanLine);
      return;
    }

    const wrongNouns: { role: VerbRole; placed: CaseNoun; target: CaseNoun }[] = [];
    let allArticlesOk = true;

    for (const role of verb.frame) {
      const placed = slots[role]!;
      const target = challengeTargets[role]!;
      const caseId = roleCaseId(verb, role);
      if (!articleMatchesTarget(placed, target, caseId)) {
        allArticlesOk = false;
      }
      if (placed.id !== target.id) {
        wrongNouns.push({ role, placed, target });
      }
    }

    const allNounsOk = wrongNouns.length === 0;
    const primaryCase: CaseKey = verb.frame.includes("dat") ? "dat" : "akk";

    if (allArticlesOk && allNounsOk) {
      cases.recordAnswer(primaryCase, cases.level, true, {
        dativeVerb: verb.frame.includes("dat"),
        nDecl: Object.values(slots).some(n => n?.nDecl),
        perfectBuild: true,
      });
      cases.addXp(50);
      setChecked("perfect");
      setFeedbackMsg(null);
      void onSpeak(germanLine);
      return;
    }

    if (allArticlesOk && !allNounsOk) {
      cases.recordAnswer(primaryCase, cases.level, true, {
        dativeVerb: verb.frame.includes("dat"),
        nDecl: Object.values(slots).some(n => n?.nDecl),
      });
      cases.addXp(20);
      const first = wrongNouns[0]!;
      setFeedbackMsg(
        `Cases ✓ — but you used ${first.placed.word} where the English said ${first.target.en} (${first.target.emoji}).`,
      );
      setChecked("cases-only");
      void onSpeak(germanLine);
      return;
    }

    cases.recordAnswer(primaryCase, cases.level, false, {
      dativeVerb: verb.frame.includes("dat"),
    });
    setFeedbackMsg("Check the articles — wrong case form for at least one slot.");
    setChecked("wrong");
    window.setTimeout(() => {
      setChecked("idle");
      setFeedbackMsg(null);
    }, 1600);
  };

  const draggingNoun = draggingId ? nouns.find(n => n.id === draggingId) : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["sandbox", "challenge"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setSlots({});
              setChecked("idle");
              setFeedbackMsg(null);
              if (m === "challenge") resetChallenge();
            }}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 10,
              border: mode === m ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
              background: mode === m ? theme.tbg : "#fff",
              color: mode === m ? theme.tc : "var(--text-muted)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {m === "sandbox" ? "Sandbox" : "Challenge"}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: theme.tmid, margin: "0 0 8px" }}>Verb wählen — bestimmt die Fälle</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {verbs.map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setVerb(v);
              setSlots({});
              setChecked("idle");
              setFeedbackMsg(null);
            }}
            style={{
              minHeight: 40,
              padding: "6px 12px",
              borderRadius: 999,
              border: verb.id === v.id ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
              background: verb.id === v.id ? theme.tbg : "#fff",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {v.infinitive}
          </button>
        ))}
      </div>

      {mode === "challenge" && (
        <div
          className="ui-card"
          style={{
            padding: "12px 14px",
            marginBottom: 12,
            border: `1.5px solid ${theme.tbd}`,
            background: theme.tbg,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 10px", fontStyle: "italic", lineHeight: 1.5 }}>
            🇬🇧 {englishLine}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {verb.frame.map(role => {
              const target = challengeTargets[role];
              if (!target) return null;
              return (
                <span
                  key={role}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "#fff",
                    border: `1px solid ${theme.tbd}`,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{target.emoji}</span>
                  <span>{target.en}</span>
                  <span style={{ fontSize: 10, color: theme.tmid, fontWeight: 600 }}>({roleLabel(role)})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {feedbackMsg && (
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: checked === "cases-only" ? CASE_COLORS.dat : "var(--red)",
            margin: "0 0 10px",
            lineHeight: 1.45,
          }}
        >
          {feedbackMsg}
        </p>
      )}

      <div
        className="ui-card"
        style={{ padding: 14, marginBottom: 12, border: `1.5px solid ${theme.tbd}`, lineHeight: 1.8 }}
      >
        {verb.frame.map(role => {
          const caseId = verb.prep && role !== "nom" ? verb.prep.case : roleToCase(role);
          const color = CASE_COLORS[caseId === "gen" ? "gen" : caseId];
          const noun = slots[role];
          return (
            <div
              key={role}
              ref={el => {
                slotRefs.current[role] = el;
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                const n = nouns.find(x => x.id === id);
                if (n) setSlots(prev => ({ ...prev, [role]: n }));
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                minWidth: 100,
                minHeight: 44,
                margin: "4px 6px 4px 0",
                padding: "6px 10px",
                borderRadius: 10,
                border: `2px dashed ${color}`,
                background: `${color}14`,
                verticalAlign: "middle",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, color, marginRight: 6 }}>{roleLabel(role)}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {noun ? phrase(noun, caseId) : "…"}
              </span>
            </div>
          );
        })}
        <span style={{ fontSize: 15, fontWeight: 700, color: theme.tc }}> {verb.conj3sg}</span>
      </div>

      <div
        ref={poolRef}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
          padding: 10,
          borderRadius: 12,
          border: `1.5px dashed ${theme.tbd}`,
          minHeight: 52,
        }}
      >
        {shelf.map(n => (
          <div
            key={n.id}
            draggable
            onDragStart={e => e.dataTransfer.setData("text/plain", n.id)}
            onPointerDown={e => startPointerDrag(n.id, e)}
            style={{
              minHeight: 44,
              padding: "8px 12px",
              borderRadius: 10,
              border: `1.5px solid ${theme.tbd}`,
              background: draggingId === n.id ? theme.tbg : "#fff",
              opacity: draggingId === n.id ? 0.4 : 1,
              cursor: "grab",
              touchAction: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {n.emoji} {dictForm(n)}
          </div>
        ))}
      </div>

      <div
        className="ui-card"
        style={{ padding: 12, marginBottom: 12, border: `1px solid ${theme.tbd}`, fontSize: 12, lineHeight: 1.55 }}
      >
        <p style={{ margin: "0 0 6px", fontWeight: 700, color: theme.tc }}>{verb.rule}</p>
        {verb.frame.map(role => {
          const noun = slots[role];
          if (!noun) return null;
          const caseId = verb.prep && role !== "nom" ? verb.prep.case : roleToCase(role);
          return (
            <p key={role} style={{ margin: "0 0 4px", color: "var(--text-muted)" }}>
              {explainArticleChange(noun, caseId)}
            </p>
          );
        })}
        <p style={{ margin: "8px 0 0", fontStyle: "italic", color: theme.tmid }}>🇬🇧 {englishLine}</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleCheck}
            disabled={
              verb.frame.some(r => !slots[r]) ||
              checked === "wrong" ||
              checked === "perfect" ||
              checked === "cases-only"
            }
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              border: "none",
              background:
                checked === "perfect"
                  ? "var(--green)"
                  : checked === "cases-only"
                    ? CASE_COLORS.dat
                    : checked === "wrong"
                      ? "var(--red)"
                      : theme.tc,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {mode === "sandbox"
              ? "Maya anhören"
              : checked === "perfect"
                ? "Perfect! +50 XP"
                : checked === "cases-only"
                  ? "Cases ✓ +20 XP"
                  : "Prüfen"}
          </button>
          <button
            type="button"
            onClick={() => void onSpeak(germanLine)}
            disabled={speaking || !slots[verb.frame[0]!]}
            aria-label="Maya"
            style={{
              minWidth: 48,
              minHeight: 48,
              borderRadius: 14,
              border: `1.5px solid ${theme.tbd}`,
              background: theme.tbg,
              color: theme.tc,
              cursor: "pointer",
            }}
          >
            {speaking ? <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> : <Volume2 size={18} />}
          </button>
        </div>
        {mode === "challenge" && (checked === "perfect" || checked === "cases-only") && (
          <button
            type="button"
            onClick={resetChallenge}
            style={{
              width: "100%",
              minHeight: 44,
              borderRadius: 12,
              border: `1.5px solid ${theme.tbd}`,
              background: "#fff",
              color: theme.tc,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Nächste Challenge →
          </button>
        )}
      </div>

      {draggingNoun && ghostPos && (
        <div
          style={{
            position: "fixed",
            left: ghostPos.x,
            top: ghostPos.y,
            transform: "translate(-50%, -50%)",
            zIndex: 200,
            pointerEvents: "none",
            padding: "8px 12px",
            borderRadius: 10,
            background: "#fff",
            boxShadow: "var(--shadow-md)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {dictForm(draggingNoun)}
        </div>
      )}
    </div>
  );
}
