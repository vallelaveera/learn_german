"use client";

import { useEffect, useState } from "react";
import { ICON_COLORS, type VocabStatus } from "@/lib/vocab/iconColors";
import { cleanWordKey } from "@/lib/vocab/icons";

interface VocabIconProps {
  word: string;
  translation?: string;
  status?: VocabStatus;
  size?: number;
  showBadge?: boolean;
  className?: string;
  /** Bump to force reload after admin regenerate */
  refreshKey?: number;
}

export function VocabIcon({
  word,
  translation,
  status = "new",
  size = 48,
  showBadge = false,
  className,
  refreshKey = 0,
}: VocabIconProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const colors = ICON_COLORS[status];
  const translationQuery = translation
    ? `&translation=${encodeURIComponent(translation)}`
    : "";
  const src = `/api/icons/${encodeURIComponent(word)}?status=${status}${translationQuery}&_=${refreshKey}`;
  const fallbackLetter = cleanWordKey(word).charAt(0).toUpperCase() || "?";
  const innerSize = size - 8;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setSvgHtml(null);

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError(true);
      }
    }, 25000);

    fetch(src)
      .then(res => {
        if (!res.ok) throw new Error(`Icon HTTP ${res.status}`);
        return res.text();
      })
      .then(text => {
        if (cancelled) return;
        if (!text.trim().startsWith("<svg")) throw new Error("Invalid SVG");
        setSvgHtml(text);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [src]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: 10,
        background: colors.bg,
        padding: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {loading && !error && (
        <div
          className="vocab-icon-pulse"
          style={{
            position: "absolute",
            inset: 4,
            borderRadius: 8,
            background: colors.bg,
          }}
        />
      )}

      {error || !svgHtml ? (
        <div
          style={{
            width: innerSize,
            height: innerSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.4,
            fontWeight: 500,
            color: colors.fill,
            fontFamily: "var(--font-sans)",
          }}
        >
          {fallbackLetter}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="vocab-icon-svg"
          style={{ width: innerSize, height: innerSize, lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      )}

      {showBadge && (
        <div
          style={{
            position: "absolute",
            bottom: -8,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9,
            fontWeight: 500,
            padding: "2px 6px",
            borderRadius: 8,
            background: colors.badgeBg,
            color: colors.badge,
            whiteSpace: "nowrap",
          }}
        >
          {colors.label}
        </div>
      )}
    </div>
  );
}
