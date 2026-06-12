"use client";

import {
  CASE_LABEL,
  CASE_QUESTION,
  CASE_TEXT,
  GENDER_LABEL,
  GENDER_SHORT,
  GENDERS,
  getArticles,
  isChangedFromNominativ,
} from "@/lib/articles/declension";
import type { ArticleType, CaseId, GenderId } from "@/lib/articles/types";

interface ArticleCaseRowProps {
  caseId: CaseId;
  articleType: ArticleType;
  highlightGender?: GenderId | null;
  revealAnswer?: boolean;
  compact?: boolean;
}

export function ArticleCaseRow({
  caseId,
  articleType,
  highlightGender = null,
  revealAnswer = true,
  compact = false,
}: ArticleCaseRowProps) {
  const articles = getArticles(articleType);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: CASE_TEXT[caseId] }}>
          {CASE_LABEL[caseId]}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
          {CASE_QUESTION[caseId]}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: compact ? 6 : 8,
        }}
      >
        {GENDERS.map(gender => {
          const value = articles[caseId][gender];
          const changed = isChangedFromNominativ(articleType, caseId, gender);
          const isHighlight = revealAnswer && highlightGender === gender;
          return (
            <div
              key={`${caseId}-${gender}`}
              style={{
                minHeight: compact ? 58 : 72,
                borderRadius: 10,
                border: isHighlight
                  ? "2px solid #1D9E75"
                  : `1px solid ${changed ? "#FECACA" : "var(--border-light)"}`,
                background: isHighlight ? "#EAF3DE" : changed ? "#FEE2E2" : "#fff",
                padding: compact ? "8px 6px" : "10px 8px",
                textAlign: "center",
                boxShadow: isHighlight ? "0 0 0 2px rgba(29, 158, 117, 0.15)" : undefined,
              }}
            >
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4 }}>
                {GENDER_SHORT[gender]}
              </div>
              <div
                style={{
                  fontSize: compact ? 16 : 18,
                  fontWeight: 700,
                  color: isHighlight ? "#1D9E75" : changed ? "#E24B4A" : CASE_TEXT[caseId],
                }}
              >
                {value}
                {changed ? "*" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function articleReferenceBridge(
  caseId: CaseId,
  gender: GenderId,
  articleType: ArticleType,
  revealAnswer: boolean,
): string {
  const articles = getArticles(articleType);
  const article = articles[caseId][gender];
  const typeLabel = articleType === "def" ? "bestimmt" : "unbestimmt";
  if (revealAnswer) {
    return `${article} — ${CASE_LABEL[caseId]}, ${GENDER_LABEL[gender]} (${typeLabel})`;
  }
  return `${CASE_LABEL[caseId]}, ${GENDER_LABEL[gender]} (${typeLabel}) — siehe Zeile unten`;
}
