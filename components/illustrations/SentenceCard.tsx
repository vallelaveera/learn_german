"use client";

import { useEffect, useState } from "react";

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  A1: { bg: "#EAF3DE", text: "#27500A" },
  A2: { bg: "#EEEDFE", text: "#3C3489" },
  B1: { bg: "#FAEEDA", text: "#633806" },
  B2: { bg: "#F1EFE8", text: "#5F5E5A" },
  C1: { bg: "#F1EFE8", text: "#2C2C2A" },
  C2: { bg: "#F1EFE8", text: "#2C2C2A" },
};

const FALLBACK_SVG = `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="160" fill="#F1EFE8"/><circle cx="100" cy="70" r="12" fill="#EEEDFE" stroke="#7F77DD" stroke-width="1.5"/><rect x="88" y="81" width="24" height="20" rx="4" fill="#7F77DD"/></svg>`;

export interface SentenceCardProps {
  sentenceId: string;
  de: string;
  en: string;
  level: string;
  size?: number;
}

export function SentenceCard({
  sentenceId,
  de,
  en,
  level,
  size = 200,
}: SentenceCardProps) {
  const [loading, setLoading] = useState(true);
  const [svg, setSvg] = useState<string | null>(null);

  const height = Math.round(size * 0.8);
  const badge = LEVEL_COLORS[level] ?? LEVEL_COLORS.A2;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSvg(null);

    fetch(`/api/illustrations/${encodeURIComponent(sentenceId)}`)
      .then(res => res.text())
      .then(text => {
        if (cancelled) return;
        setSvg(text.trim().startsWith("<svg") ? text : FALLBACK_SVG);
      })
      .catch(() => {
        if (!cancelled) setSvg(FALLBACK_SVG);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sentenceId]);

  return (
    <article
      style={{
        width: size,
        maxWidth: "100%",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #e5e5e5)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          background: "#F1EFE8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 6,
            background: badge.bg,
            color: badge.text,
          }}
        >
          {level}
        </span>

        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#EEEDFE",
              opacity: 0.7,
            }}
          />
        )}

        {svg && (
          <div
            style={{ width: "100%", height: "100%", lineHeight: 0 }}
            dangerouslySetInnerHTML={{ __html: svg }}
            aria-hidden="true"
          />
        )}
      </div>

      <div style={{ padding: "12px 14px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text, #1a1a1a)",
            lineHeight: 1.45,
          }}
        >
          {de}
        </p>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            fontStyle: "italic",
            color: "var(--text-muted, #666)",
            lineHeight: 1.4,
          }}
        >
          {en}
        </p>
      </div>
    </article>
  );
}
