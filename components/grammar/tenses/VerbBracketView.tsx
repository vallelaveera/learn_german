"use client";

import { useMemo } from "react";
import { bracketParts, tenseById, type BuildTenseId, type SubjectId, type VerbId } from "@/constants/germanTenses";
import { SUBJECTS } from "@/constants/germanTenses";
import type { TenseTabTheme } from "@/lib/tenses/theme";

interface VerbBracketViewProps {
  theme: TenseTabTheme;
  verbId: VerbId;
  tenseId: BuildTenseId;
  subjectId: SubjectId;
  closed?: boolean;
}

export function VerbBracketView({ theme, verbId, tenseId, subjectId, closed = false }: VerbBracketViewProps) {
  const tense = tenseById(tenseId);
  const bp = useMemo(() => bracketParts(verbId, tenseId, subjectId), [verbId, tenseId, subjectId]);
  const subj = SUBJECTS.find(s => s.id === subjectId)!;

  return (
    <div className="ui-card" style={{ padding: 16, marginBottom: 12, border: `1.5px solid ${theme.tbd}` }}>
      <p style={{ fontSize: 11, color: theme.tmid, margin: "0 0 12px", fontWeight: 600 }}>
        Satzklammer · {tense.label}
      </p>
      <div style={{ position: "relative", padding: "8px 0 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 6, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 700 }}>{subj.start}</span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: `${tense.color}18`,
              border: `2px solid ${tense.color}`,
              color: tense.color,
              fontWeight: 800,
            }}
          >
            {bp.v2 || "…"}
          </span>
          {bp.middle && <span style={{ color: "var(--text-muted)" }}>{bp.middle.trim()}</span>}
          {bp.hasBracket && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                background: `${tense.color}18`,
                border: `2px solid ${tense.color}`,
                color: tense.color,
                fontWeight: 800,
              }}
            >
              {bp.end || "…"}
            </span>
          )}
        </div>
        {bp.hasBracket && (
          <svg
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 24,
              overflow: "visible",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <path
              d="M 24 4 Q 24 18 120 18 L 280 18 Q 320 18 320 4"
              fill="none"
              stroke={tense.color}
              strokeWidth={2}
              strokeDasharray={closed ? "0" : "6 4"}
              style={{
                transition: closed ? "stroke-dashoffset 600ms ease, opacity 400ms" : undefined,
                opacity: closed ? 1 : 0.65,
              }}
            />
          </svg>
        )}
      </div>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, margin: 0, color: "var(--text)" }}>
        {bp.segments.map((seg, i) =>
          seg.highlight ? (
            <span key={i} style={{ color: tense.color, fontWeight: 800 }}>
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
    </div>
  );
}
