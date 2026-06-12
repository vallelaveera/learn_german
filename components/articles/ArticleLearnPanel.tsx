"use client";

import { useMemo, useState } from "react";
import {
  CASE_COLOR,
  CASE_LABEL,
  CASE_QUESTION,
  CASE_TEXT,
  CASES,
  GENDER_LABEL,
  GENDER_SHORT,
  GENDERS,
  getArticles,
  isChangedFromNominativ,
} from "@/lib/articles/declension";
import { getExample } from "@/lib/articles/examples";
import type { ArticleType, CaseId } from "@/lib/articles/types";

interface ArticleLearnPanelProps {
  scopedCases: CaseId[];
  levelColor: string;
  levelLightColor: string;
}

export function ArticleLearnPanel({ scopedCases, levelColor, levelLightColor }: ArticleLearnPanelProps) {
  const [articleType, setArticleType] = useState<ArticleType>("def");
  const [activeCase, setActiveCase] = useState<CaseId>(scopedCases[0] ?? "nom");
  const [showAllCases, setShowAllCases] = useState(false);
  const [selectedExample, setSelectedExample] = useState<{
    type: ArticleType;
    caseId: CaseId;
    gender: (typeof GENDERS)[number];
  } | null>(null);

  const visibleCases = showAllCases ? CASES : scopedCases;
  const articles = getArticles(articleType);

  const exampleBanner = useMemo(() => {
    if (!selectedExample) return null;
    const { type, caseId, gender } = selectedExample;
    return {
      label: `${CASE_LABEL[caseId]} / ${GENDER_LABEL[gender]}`,
      text: getExample(type, caseId, gender),
      background: CASE_COLOR[caseId],
      color: CASE_TEXT[caseId],
    };
  }, [selectedExample]);

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
        Wähle einen Fall und tippe ein Feld für ein Beispiel. Rot = Artikel ändert sich gegenüber Nominativ.
      </p>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          padding: 4,
          borderRadius: 12,
          background: "var(--surface)",
          border: "1px solid var(--border-light)",
        }}
      >
        {(["def", "indef"] as ArticleType[]).map(type => {
          const active = articleType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setArticleType(type)}
              style={{
                flex: 1,
                minHeight: 40,
                border: "none",
                borderRadius: 10,
                background: active ? levelLightColor : "transparent",
                color: active ? levelColor : "var(--text-muted)",
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {type === "def" ? "Bestimmt (der/die/das)" : "Unbestimmt (ein/eine)"}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {scopedCases.map(caseId => {
          const active = activeCase === caseId && !showAllCases;
          return (
            <button
              key={caseId}
              type="button"
              onClick={() => {
                setActiveCase(caseId);
                setShowAllCases(false);
              }}
              style={{
                flex: "1 1 auto",
                minWidth: 72,
                minHeight: 40,
                borderRadius: 10,
                border: `1.5px solid ${active ? CASE_TEXT[caseId] : "var(--border-light)"}`,
                background: active ? CASE_COLOR[caseId] : "#fff",
                color: CASE_TEXT[caseId],
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {CASE_LABEL[caseId]}
            </button>
          );
        })}
      </div>

      {(showAllCases ? visibleCases : [activeCase]).map(caseId => (
        <div key={caseId} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: CASE_TEXT[caseId] }}>
              {CASE_LABEL[caseId]}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
              {CASE_QUESTION[caseId]}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            {GENDERS.map(gender => {
              const value = articles[caseId][gender];
              const changed = isChangedFromNominativ(articleType, caseId, gender);
              return (
                <button
                  key={`${caseId}-${gender}`}
                  type="button"
                  onClick={() => setSelectedExample({ type: articleType, caseId, gender })}
                  style={{
                    minHeight: 72,
                    borderRadius: 12,
                    border: `1px solid ${changed ? "#FECACA" : "var(--border-light)"}`,
                    background: changed ? "#FEE2E2" : "#fff",
                    cursor: "pointer",
                    padding: "10px 12px",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                    {GENDER_LABEL[gender]} ({GENDER_SHORT[gender]})
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: changed ? "#E24B4A" : CASE_TEXT[caseId],
                    }}
                  >
                    {value}
                    {changed ? "*" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {exampleBanner && (
        <div
          style={{
            marginTop: 4,
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            background: exampleBanner.background,
            color: exampleBanner.color,
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <strong>{exampleBanner.label}:</strong> {exampleBanner.text}
        </div>
      )}

      {scopedCases.length < CASES.length && (
        <button
          type="button"
          onClick={() => setShowAllCases(v => !v)}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 12,
            border: "1px solid var(--border-light)",
            background: "#fff",
            color: levelColor,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showAllCases ? "Nur relevante Fälle zeigen" : "Alle Fälle anzeigen"}
        </button>
      )}
    </div>
  );
}
