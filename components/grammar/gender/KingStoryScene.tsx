"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { GERMAN_PATTERNS, patternFullSentence } from "@/lib/gender/germanPatterns";
import type { GenderArticle } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";
import { FigSvg, HorseSvg, TreeSvg } from "@/lib/gender/kingStoryArt";
import { GenderHighlightedSentence } from "./GenderHighlightedSentence";

/** Scene positions — king stops at each article spot (adapted BEATS pattern). */
const BEATS: {
  id: GenderArticle;
  pos: number;
  label: string;
  edge?: "left" | "right";
  ring?: boolean;
  conn?: boolean;
}[] = [
  { id: "der", pos: 16, label: "der", edge: "left", conn: true },
  { id: "die", pos: 50, label: "die", ring: true },
  { id: "das", pos: 84, label: "das", edge: "right", conn: true },
];

const TOKEN = 52;
const GLIDE_MS = 600;
const JETZT_POS = 50;

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

function posToTokenPx(pos: number, roadW: number): number {
  if (roadW <= 0) return 0;
  return (pos / 100) * roadW - TOKEN / 2;
}

function posToPx(pos: number, roadW: number): number {
  if (roadW <= 0) return 0;
  return (pos / 100) * roadW;
}

interface KingStorySceneProps {
  article: GenderArticle;
  onSpeak?: (text: string) => void;
}

export function KingStoryScene({ article, onSpeak }: KingStorySceneProps) {
  const reducedMotion = useReducedMotion();
  const roadRef = useRef<HTMLDivElement>(null);
  const [roadW, setRoadW] = useState(0);
  const beat = BEATS.find(b => b.id === article)!;
  const pattern = GERMAN_PATTERNS.find(p => p.article === article)!;
  const color = GENDER_ARTICLE_COLORS[article];
  const [tokenPx, setTokenPx] = useState(0);

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
    setTokenPx(posToTokenPx(beat.pos, roadW));
  }, [beat.pos, roadW, reducedMotion]);

  const threadFrom = posToPx(beat.pos, roadW);
  const threadTo = posToPx(JETZT_POS, roadW);

  return (
    <div
      className="king-story-scene"
      style={{
        ["--page" as string]: "#f4efe6",
        ["--card" as string]: "#fff",
        ["--card2" as string]: "#faf7f2",
        ["--grass" as string]: "#7cb66f",
        ["--grass-edge" as string]: "#5a944f",
        background: "var(--card2)",
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.06)",
        padding: "12px 12px 14px",
        marginBottom: 14,
        maxWidth: 420,
      }}
    >
      <style>{`
        @keyframes king-pulse-ring {
          0% { transform: scale(0.85); opacity: 0.65; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes king-flag-drop {
          0% { transform: translateY(-14px) scale(0.7); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .king-pulse-ring {
          position: absolute; inset: -8px; border-radius: 999px;
          border: 2px solid currentColor;
          animation: king-pulse-ring 1.8s ease-out infinite;
          pointer-events: none;
        }
        .king-flag-drop { animation: king-flag-drop 480ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards; }
      `}</style>

      <div
        ref={roadRef}
        className="scene-wrap"
        style={{ position: "relative", height: 118, userSelect: "none" }}
      >
        {/* Edge figures */}
        <div className="edge" style={{ position: "absolute", left: 4, bottom: 38, opacity: 0.9 }}>
          <FigSvg kind="father" size={40} />
        </div>
        <div className="edge" style={{ position: "absolute", right: 4, bottom: 38, opacity: 0.9 }}>
          <FigSvg kind="kid" size={36} />
        </div>

        {/* Trees middle */}
        <div style={{ position: "absolute", left: "42%", bottom: 36, display: "flex", gap: 4 }}>
          <TreeSvg size={36} />
          <TreeSvg size={42} />
        </div>

        {/* Ground */}
        <div
          className="ground"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 28,
            height: 14,
            borderRadius: 999,
            background: "linear-gradient(180deg, var(--grass) 0%, var(--grass-edge) 100%)",
            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.25)",
          }}
        />

        {/* Sun / JETZT at center */}
        <div
          className="nowline"
          style={{
            position: "absolute",
            left: `${JETZT_POS}%`,
            bottom: 52,
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FFE566, #FFB800)",
              boxShadow: "0 0 12px rgba(255,184,0,0.5)",
            }}
          />
          <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: "#B45309" }}>JETZT</span>
        </div>

        {/* Spot markers */}
        {BEATS.map(b => (
          <div
            key={b.id}
            className="spot"
            style={{
              position: "absolute",
              left: `${b.pos}%`,
              bottom: 34,
              transform: "translateX(-50%)",
              fontSize: 9,
              fontWeight: 800,
              color: GENDER_ARTICLE_COLORS[b.id],
              opacity: b.id === article ? 1 : 0.45,
            }}
          >
            {b.label}
          </div>
        ))}

        {/* Dotted connector for der/das toward center */}
        {beat.conn && roadW > 0 && (
          <svg
            className="conn"
            style={{ position: "absolute", left: 0, bottom: 34, width: roadW, height: 20, pointerEvents: "none" }}
            aria-hidden
          >
            <line
              x1={threadFrom}
              y1={10}
              x2={threadTo}
              y2={10}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="3 4"
              opacity={0.6}
            />
          </svg>
        )}

        {/* ONE persistent king+horse token */}
        <div
          className="king"
          style={{
            position: "absolute",
            left: 0,
            bottom: 38,
            width: TOKEN,
            height: TOKEN,
            transform: `translateX(${tokenPx}px)`,
            transition: reducedMotion ? "none" : `transform ${GLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            zIndex: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "flex-end" }}>
            {beat.ring && !reducedMotion && (
              <span className="king-pulse-ring" style={{ color }} aria-hidden />
            )}
            <HorseSvg size={28} />
            <div style={{ marginBottom: 4, marginLeft: -6 }}>
              <FigSvg kind={article === "die" ? "queen" : "king"} size={34} />
            </div>
          </div>
          {article === "das" && (
            <span
              key="das-flag"
              className={reducedMotion ? undefined : "king-flag-drop"}
              style={{ position: "absolute", top: -8, right: -4, fontSize: 14 }}
            >
              🚩
            </span>
          )}
        </div>
      </div>

      {/* Sentence panel */}
      <div
        className="ui-card"
        style={{
          padding: "12px 14px",
          background: "var(--card)",
          border: `1.5px solid ${color}44`,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 6px" }}>
            {pattern.character} · {article}
          </p>
          <GenderHighlightedSentence pattern={pattern} articleColor={color} />
        </div>
        {onSpeak && (
          <button
            type="button"
            aria-label="Vorlesen"
            onClick={() => onSpeak(patternFullSentence(pattern))}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: `1px solid ${color}55`,
              background: "#fff",
              color,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Volume2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
