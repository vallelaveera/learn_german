"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Flag, Maximize2, Minimize2, RotateCw, Volume2 } from "lucide-react";
import {
  GLIDE_MS,
  JETZT_POS,
  ROAD_H,
  SUBJECTS,
  TOKEN,
  VERBS,
  parts,
  posToPx,
  posToTokenPx,
  tenseById,
  timelineTensesForLevel,
  verbsForLevel,
  type BuildTenseId,
  type SubjectId,
  type VerbId,
} from "@/constants/germanTenses";
import type { TenseLevel } from "@/lib/tenses/types";

export interface TenseTimelineProps {
  onSpeak?: (text: string, lang?: string) => void;
  level?: TenseLevel;
  verbId?: VerbId;
  tenseId?: BuildTenseId;
  subjectId?: SubjectId;
  onVerbChange?: (id: VerbId) => void;
  onTenseChange?: (id: BuildTenseId) => void;
  onSubjectChange?: (id: SubjectId) => void;
  hideVerbPicker?: boolean;
  hideSubjectRow?: boolean;
  hideSentence?: boolean;
  compact?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  onMinimize?: () => void;
  landscape?: boolean;
  onToggleLandscape?: () => void;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function TenseTimeline({
  onSpeak,
  level = "B1",
  verbId: verbIdProp,
  tenseId: tenseIdProp,
  subjectId: subjectIdProp,
  onVerbChange,
  onTenseChange,
  onSubjectChange,
  hideVerbPicker = false,
  hideSubjectRow = false,
  hideSentence = false,
  compact = false,
  expanded = false,
  onExpand,
  onMinimize,
  landscape = false,
  onToggleLandscape,
}: TenseTimelineProps) {
  const reducedMotion = useReducedMotion();
  const roadRef = useRef<HTMLDivElement>(null);
  const [roadW, setRoadW] = useState(0);
  const [verbIdLocal, setVerbIdLocal] = useState<VerbId>("machen");
  const [tenseIdLocal, setTenseIdLocal] = useState<BuildTenseId>("praes");
  const [subjectIdLocal, setSubjectIdLocal] = useState<SubjectId>("ich");

  const verbId = verbIdProp ?? verbIdLocal;
  const tenseId = tenseIdProp ?? tenseIdLocal;
  const subjectId = subjectIdProp ?? subjectIdLocal;

  const availableTenses = useMemo(() => timelineTensesForLevel(level), [level]);
  const availableVerbs = useMemo(() => verbsForLevel(level), [level]);

  const setVerbId = (id: VerbId) => {
    if (onVerbChange) onVerbChange(id);
    else setVerbIdLocal(id);
  };
  const setTenseId = (id: BuildTenseId) => {
    if (onTenseChange) onTenseChange(id);
    else setTenseIdLocal(id);
  };
  const setSubjectId = (id: SubjectId) => {
    if (onSubjectChange) onSubjectChange(id);
    else setSubjectIdLocal(id);
  };

  const tense = tenseById(tenseId);
  const verb = VERBS[verbId] ?? VERBS.machen!;
  const { segments, full } = useMemo(() => parts(verbId, tenseId, subjectId), [verbId, tenseId, subjectId]);

  const targetPx = posToTokenPx(tense.pos, roadW);
  const [tokenPx, setTokenPx] = useState(0);
  const tokenPxRef = useRef(0);

  useEffect(() => {
    const el = roadRef.current;
    if (!el) return;
    const measure = () => setRoadW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (roadW <= 0) return;
    const next = posToTokenPx(tense.pos, roadW);
    if (reducedMotion) {
      tokenPxRef.current = next;
      setTokenPx(next);
      return;
    }
    tokenPxRef.current = next;
    setTokenPx(next);
  }, [tense.pos, roadW, reducedMotion]);

  const threadFrom = posToPx(tense.pos, roadW);
  const threadTo = posToPx(JETZT_POS, roadW);
  const flagPx = tense.flagPos != null ? posToPx(tense.flagPos, roadW) : null;

  const tokenState = tense.tokenState;
  const showPulse = tokenState === "present" && !reducedMotion;
  const showBob = tokenState === "present" && !reducedMotion;
  const showCheck = tokenState === "past" || tokenState === "futdone";
  const dashed = tokenState === "future" || tokenState === "futdone";
  const faded = tokenState === "future";

  const handleSpeak = useCallback(() => {
    onSpeak?.(full, "de-DE");
  }, [full, onSpeak]);

  const glideStyle: React.CSSProperties = {
    transform: `translateX(${tokenPx}px)`,
    transition: reducedMotion ? "none" : `transform ${GLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  };

  return (
    <div
      className="tense-timeline-root"
      style={{
        transform: landscape ? "rotate(90deg)" : undefined,
        transformOrigin: landscape ? "center center" : undefined,
        width: landscape ? "100dvh" : "100%",
        maxWidth: landscape ? "100dvw" : "100%",
      }}
    >
      <style>{`
        @keyframes tense-pulse-ring {
          0% { transform: scale(0.85); opacity: 0.7; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes tense-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes tense-flag-drop {
          0% { transform: translateY(-18px) scale(0.6); opacity: 0; }
          60% { transform: translateY(2px) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .tense-token-bob { animation: tense-bob 2.4s ease-in-out infinite; }
        .tense-pulse-ring {
          position: absolute; inset: -6px; border-radius: 999px;
          border: 2px solid currentColor;
          animation: tense-pulse-ring 1.8s ease-out infinite;
          pointer-events: none;
        }
        .tense-flag-drop { animation: tense-flag-drop 520ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
        <p style={{ margin: 0, fontSize: compact ? 11 : 12, color: "var(--text-muted)", fontWeight: 600 }}>
          Zeitstraße · Vergangenheit ← JETZT → Zukunft
        </p>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {onToggleLandscape && (
            <button
              type="button"
              aria-label="Rotate view"
              onClick={onToggleLandscape}
              style={iconBtnStyle}
            >
              <RotateCw size={16} />
            </button>
          )}
          {!expanded && onExpand && (
            <button type="button" aria-label="Expand timeline" onClick={onExpand} style={iconBtnStyle}>
              <Maximize2 size={16} />
            </button>
          )}
          {expanded && onMinimize && (
            <button type="button" aria-label="Minimize timeline" onClick={onMinimize} style={iconBtnStyle}>
              <Minimize2 size={16} />
            </button>
          )}
        </div>
      </div>

      {!hideVerbPicker && (
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", maxHeight: 88, overflowY: "auto" }}>
        {availableVerbs.map(v => {
          const active = verbId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVerbId(v.id)}
              style={{
                minHeight: 38,
                padding: "6px 12px",
                borderRadius: 999,
                border: active ? `2px solid ${tense.color}` : "1px solid var(--border-light)",
                background: active ? `${tense.color}14` : "#fff",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{v.emoji}</span>
              {v.infinitive}
            </button>
          );
        })}
      </div>
      )}

      {/* Time road */}
      <div
        ref={roadRef}
        style={{
          position: "relative",
          height: ROAD_H + 36,
          marginBottom: 12,
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 18,
            height: ROAD_H,
            borderRadius: ROAD_H / 2,
            background: "linear-gradient(90deg, #E8EAF6 0%, #D1FAE5 50%, #FFEDD5 100%)",
            border: "1px solid var(--border-light)",
            overflow: "hidden",
          }}
        >
          {/* JETZT pin */}
          <div
            style={{
              position: "absolute",
              left: `${JETZT_POS}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: "#1F7A5C",
              transform: "translateX(-50%)",
              opacity: 0.55,
            }}
          />
        </div>

        {/* Perfekt dotted thread */}
        {tense.showThread && roadW > 0 && (
          <svg
            style={{ position: "absolute", left: 0, top: 18, width: roadW, height: ROAD_H, pointerEvents: "none" }}
            aria-hidden
          >
            <line
              x1={threadFrom}
              y1={ROAD_H / 2}
              x2={threadTo}
              y2={ROAD_H / 2}
              stroke="#5B6ABF"
              strokeWidth={2}
              strokeDasharray="4 5"
              opacity={0.75}
            />
          </svg>
        )}

        {/* Reference flag (Plusqu / Futur II) */}
        {flagPx != null && roadW > 0 && (
          <div
            key={tenseId}
            className={reducedMotion ? undefined : "tense-flag-drop"}
            style={{
              position: "absolute",
              left: flagPx,
              top: 2,
              transform: "translateX(-50%)",
              color: tense.color,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Flag size={14} fill="currentColor" />
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.04em" }}>REF</span>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: `${JETZT_POS}%`,
            top: ROAD_H + 22,
            transform: "translateX(-50%)",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#1F7A5C",
          }}
        >
          JETZT
        </div>

        {/* ONE persistent token — translateX only */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 18 + (ROAD_H - TOKEN) / 2,
            width: TOKEN,
            height: TOKEN,
            ...glideStyle,
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <div
            className={showBob ? "tense-token-bob" : undefined}
            style={{
              position: "relative",
              width: TOKEN,
              height: TOKEN,
              borderRadius: TOKEN / 2,
              background: "#fff",
              border: dashed ? `2px dashed ${tense.color}` : `2.5px solid ${tense.color}`,
              opacity: faded ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              color: tense.color,
              fontSize: 18,
            }}
          >
            {showPulse && <span className="tense-pulse-ring" aria-hidden />}
            <span>{verb.emoji}</span>
            {showCheck && (
              <span
                style={{
                  position: "absolute",
                  right: -4,
                  bottom: -4,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: tense.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #fff",
                }}
              >
                <Check size={10} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>

        {/* Road labels */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: ROAD_H + 36,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            fontWeight: 700,
            color: "var(--text-dim)",
            padding: "0 4px",
          }}
        >
          <span>Vergangenheit</span>
          <span>Zukunft</span>
        </div>
      </div>

      {/* Tense chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {availableTenses.map(t => {
          const active = tenseId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTenseId(t.id)}
              style={{
                minHeight: 36,
                padding: "4px 10px",
                borderRadius: 8,
                border: active ? `2px solid ${t.color}` : "1px solid var(--border-light)",
                background: active ? `${t.color}18` : "#fff",
                color: active ? t.color : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {t.short}
            </button>
          );
        })}
      </div>

      {!hideSentence && (
      <div
        className="ui-card"
        style={{
          padding: "14px 16px",
          marginBottom: 12,
          border: `1.5px solid ${tense.color}44`,
          background: `${tense.color}0A`,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <p
          style={{
            flex: 1,
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: compact ? 15 : 17,
            lineHeight: 1.55,
            color: "var(--text)",
          }}
        >
          {segments.map((seg, i) =>
            seg.highlight ? (
              <span key={i} style={{ color: tense.color, fontWeight: 800 }}>
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
        {onSpeak && (
          <button
            type="button"
            aria-label="Sentence vorlesen"
            onClick={handleSpeak}
            style={{
              ...iconBtnStyle,
              flexShrink: 0,
              color: tense.color,
              borderColor: `${tense.color}55`,
            }}
          >
            <Volume2 size={18} />
          </button>
        )}
      </div>
      )}

      {!hideSubjectRow && (
      <>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
        Pronomen — Satz neu bilden
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {SUBJECTS.map(s => {
          const active = subjectId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubjectId(s.id)}
              style={{
                minWidth: 36,
                minHeight: 36,
                padding: "0 8px",
                borderRadius: 8,
                border: active ? `2px solid ${tense.color}` : "1px solid var(--border-light)",
                background: active ? `${tense.color}18` : "#fff",
                color: active ? tense.color : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 10, color: "var(--text-dim)", lineHeight: 1.45 }}>
        {verb.usesSein ? "⬤ Motion/change → sein" : "⬤ Default → haben"} in compound tenses
      </p>
      </>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid var(--border-light)",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-muted)",
};
