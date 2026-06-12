"use client";

import { useEffect, useState } from "react";

const FALLBACK_SVG = `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="160" fill="#F1EFE8"/><circle cx="100" cy="70" r="12" fill="#EEEDFE" stroke="#7F77DD" stroke-width="1.5"/><rect x="88" y="81" width="24" height="20" rx="4" fill="#7F77DD"/></svg>`;

export interface SentenceIllustrationProps {
  sentenceId: string;
  height?: number;
}

/** Inline animated SVG for sentence practice (fetches by illustration id). */
export function SentenceIllustration({ sentenceId, height = 140 }: SentenceIllustrationProps) {
  const [loading, setLoading] = useState(true);
  const [svg, setSvg] = useState<string | null>(null);

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
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 8,
        overflow: "hidden",
        background: "#F1EFE8",
        marginBottom: 12,
      }}
    >
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
  );
}
