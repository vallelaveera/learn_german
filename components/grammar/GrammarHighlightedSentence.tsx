"use client";

import {
  buildHighlightedParts,
  parseGrammarFocusTerms,
  type SentencePart,
} from "@/lib/grammar/highlight";

interface GrammarHighlightedSentenceProps {
  sentence: string;
  subtitle: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

function HighlightedParts({ parts, size }: { parts: SentencePart[]; size: "sm" | "md" | "lg" }) {
  const fontSize = size === "lg" ? 20 : size === "md" ? 17 : 14;
  const lineHeight = size === "lg" ? 1.55 : size === "md" ? 1.5 : 1.45;

  return (
    <span style={{ fontFamily: "var(--font-serif)", fontSize, lineHeight, color: "var(--text)" }}>
      {parts.map((part, index) =>
        part.highlight ? (
          <span
            key={`${part.text}-${index}`}
            style={{
              textDecoration: "underline",
              textDecorationThickness: 2,
              textUnderlineOffset: 3,
              fontWeight: 600,
            }}
          >
            {part.text}
          </span>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export function GrammarHighlightedSentence({
  sentence,
  subtitle,
  size = "md",
  color,
}: GrammarHighlightedSentenceProps) {
  const terms = parseGrammarFocusTerms(subtitle);
  const parts = buildHighlightedParts(sentence, terms);

  if (color) {
    return (
      <p style={{ margin: 0, color }}>
        <HighlightedParts parts={parts} size={size} />
      </p>
    );
  }

  return (
    <p style={{ margin: 0 }}>
      <HighlightedParts parts={parts} size={size} />
    </p>
  );
}
