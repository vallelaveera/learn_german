"use client";

import { useEffect, useState } from "react";

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍎",
  travel: "✈️",
  work: "💼",
  home: "🏠",
  people: "👥",
  shopping: "🛒",
  health: "💊",
  nature: "🌿",
  daily: "☀️",
  education: "📚",
};

interface OfflineIllustrationProps {
  illustrationId?: string;
  height?: number;
}

/** Bundled category SVG from /data/offline/illustrations — works offline after download. */
export function OfflineIllustration({ illustrationId, height = 120 }: OfflineIllustrationProps) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!illustrationId) return;
    let cancelled = false;
    fetch(`/data/offline/illustrations/${illustrationId}.svg`)
      .then(r => (r.ok ? r.text() : null))
      .then(text => {
        if (!cancelled && text?.trim().startsWith("<svg")) setSvg(text);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [illustrationId]);

  const emoji = illustrationId ? CATEGORY_EMOJI[illustrationId] ?? "📖" : "📖";

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--brand-orange-soft)",
        border: "1px solid var(--border-light)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      }}
    >
      {svg ? (
        <div
          style={{ width: "72%", height: "72%" }}
          dangerouslySetInnerHTML={{ __html: svg }}
          aria-hidden
        />
      ) : (
        <span style={{ fontSize: height * 0.35 }}>{emoji}</span>
      )}
    </div>
  );
}
