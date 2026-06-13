"use client";

import { useState } from "react";
import { GERMAN_PATTERNS, patternFullSentence } from "@/lib/gender/germanPatterns";
import type { GenderArticle } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";
import type { GenderTabTheme } from "@/lib/gender/theme";
import { GenderHighlightedSentence } from "./GenderHighlightedSentence";

interface GenderPatternsTabProps {
  theme: GenderTabTheme;
}

export function GenderPatternsTab({ theme }: GenderPatternsTabProps) {
  const [subTab, setSubTab] = useState<GenderArticle>("der");
  const pattern = GERMAN_PATTERNS.find(p => p.article === subTab)!;
  const full = patternFullSentence(pattern);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["der", "die", "das"] as const).map(article => (
          <button
            key={article}
            type="button"
            onClick={() => setSubTab(article)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              border: subTab === article ? `2px solid ${GENDER_ARTICLE_COLORS[article]}` : `1.5px solid ${theme.tbd}`,
              background: subTab === article ? `${GENDER_ARTICLE_COLORS[article]}18` : "#fff",
              color: GENDER_ARTICLE_COLORS[article],
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {article}
          </button>
        ))}
      </div>

      <div
        className="ui-card"
        style={{
          padding: 16,
          marginBottom: 14,
          border: `1.5px solid ${GENDER_ARTICLE_COLORS[subTab]}`,
          background: `${GENDER_ARTICLE_COLORS[subTab]}0c`,
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: theme.tmid, margin: "0 0 4px", textTransform: "uppercase" }}>
          {pattern.character}
        </p>
        <p style={{ fontSize: 28, fontWeight: 900, color: GENDER_ARTICLE_COLORS[subTab], margin: "0 0 10px" }}>
          {subTab}
        </p>
        <GenderHighlightedSentence pattern={pattern} articleColor={GENDER_ARTICLE_COLORS[subTab]} />
        <p style={{ fontSize: 11, color: theme.tmid, margin: "10px 0 0", fontStyle: "italic" }}>
          {full}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pattern.rules.map(rule => (
          <div key={rule.tag} className="ui-card" style={{ padding: "12px 14px", border: `1px solid ${theme.tbd}` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: theme.tc,
                  background: theme.tbg,
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {rule.tag}
              </code>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{rule.note}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {rule.examples.map(ex => (
                <span
                  key={ex}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: theme.tbg,
                    color: theme.tc,
                    border: `1px solid ${theme.tbd}`,
                  }}
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
