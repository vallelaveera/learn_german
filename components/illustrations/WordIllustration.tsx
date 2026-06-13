"use client";

import { useEffect, useState } from "react";
import { resolveWordIllustrationId } from "@/lib/content/illustration-lookup";
import { PLACEHOLDER_ILLUSTRATION_SVG } from "@/lib/content/sentence-illustrations";
import { VocabIcon } from "@/components/vocab/VocabIcon";

export interface WordIllustrationProps {
  wordId: string;
  german: string;
  height?: number;
}

function isRealIllustration(svg: string): boolean {
  return svg.trim() !== PLACEHOLDER_ILLUSTRATION_SVG.trim() && svg.trim().startsWith("<svg");
}

/** Animated scene SVG for vocabulary (fetches word-{id} from illustration storage). */
export function WordIllustration({ wordId, german, height = 130 }: WordIllustrationProps) {
  const illustrationId = resolveWordIllustrationId(wordId);
  const [loading, setLoading] = useState(true);
  const [svg, setSvg] = useState<string | null>(null);
  const [useIconFallback, setUseIconFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSvg(null);
    setUseIconFallback(false);

    fetch(`/api/illustrations/${encodeURIComponent(illustrationId)}`)
      .then(res => res.text())
      .then(text => {
        if (cancelled) return;
        if (isRealIllustration(text)) {
          setSvg(text.trim());
        } else {
          setUseIconFallback(true);
        }
      })
      .catch(() => {
        if (!cancelled) setUseIconFallback(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [illustrationId]);

  if (useIconFallback) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <VocabIcon word={german} size={Math.min(height, 88)} status="new" />
      </div>
    );
  }

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
