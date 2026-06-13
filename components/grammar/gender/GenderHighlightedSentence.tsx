"use client";

import type { GenderPattern } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";
import { splitKeyHighlight } from "@/lib/gender/highlight";

interface GenderHighlightedSentenceProps {
  pattern: GenderPattern;
  articleColor?: string;
  size?: "md" | "lg";
}

function KeyWord({
  keyWord,
  hint,
  color,
  size,
}: {
  keyWord: string;
  hint: string;
  color: string;
  size: "md" | "lg";
}) {
  const { before, highlight, after, whole } = splitKeyHighlight(keyWord, hint);
  const fontSize = size === "lg" ? 13 : 12;

  return (
    <span
      style={{
        display: "inline-block",
        padding: size === "lg" ? "2px 9px" : "1px 8px",
        borderRadius: 6,
        background: color,
        color: "#fff",
        fontWeight: 700,
        fontSize,
        margin: "0 1px",
        verticalAlign: "middle",
      }}
    >
      {whole ? (
        highlight
      ) : (
        <>
          {before}
          <span
            style={{
              textDecoration: "underline",
              textDecorationThickness: 2,
              textUnderlineOffset: 2,
            }}
          >
            {highlight}
          </span>
          {after}
        </>
      )}
    </span>
  );
}

export function GenderHighlightedSentence({
  pattern,
  articleColor,
  size = "md",
}: GenderHighlightedSentenceProps) {
  const color = articleColor ?? GENDER_ARTICLE_COLORS[pattern.article];
  const lineHeight = size === "lg" ? 1.7 : 1.65;
  const fontSize = size === "lg" ? 15 : 14;

  return (
    <p style={{ fontSize, lineHeight, margin: 0 }}>
      {pattern.keys.map((keyWord, i) => (
        <span key={`${keyWord}-${i}`}>
          {pattern.frameParts[i]}
          <KeyWord keyWord={keyWord} hint={pattern.hints[i] ?? ""} color={color} size={size} />
        </span>
      ))}
      {pattern.frameParts[pattern.keys.length]}
    </p>
  );
}
