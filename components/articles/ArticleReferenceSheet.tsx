"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CASE_LABEL } from "@/lib/articles/declension";
import type { ArticleType, CaseId, GenderId } from "@/lib/articles/types";
import { ArticleCaseRow, articleReferenceBridge } from "./ArticleCaseRow";

interface ArticleReferenceSheetProps {
  open: boolean;
  onClose: () => void;
  caseId: CaseId;
  gender: GenderId;
  articleType: ArticleType;
  scopedCases: CaseId[];
  levelColor: string;
  revealAnswer: boolean;
}

export function ArticleReferenceSheet({
  open,
  onClose,
  caseId,
  gender,
  articleType,
  scopedCases,
  levelColor,
  revealAnswer,
}: ArticleReferenceSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [showAllCases, setShowAllCases] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setShowAllCases(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const otherCases = scopedCases.filter(c => c !== caseId);
  const typeLabel = articleType === "def" ? "Bestimmter Artikel" : "Unbestimmter Artikel";

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 180,
          background: "rgba(0,0,0,0.45)",
          border: "none",
          cursor: "pointer",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Artikel-Tabelle"
        style={{
          position: "fixed",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          zIndex: 190,
          width: "100%",
          maxWidth: 390,
          maxHeight: "78dvh",
          background: "var(--bg)",
          borderRadius: "16px 16px 0 0",
          padding: "18px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: levelColor,
                margin: "0 0 4px",
              }}
            >
              {typeLabel}
            </p>
            <h2 className="ui-title-serif" style={{ fontSize: 18, margin: 0 }}>
              Artikel-Tabelle
            </h2>
          </div>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--border-light)",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <p
          style={{
            fontSize: 13,
            color: "var(--text)",
            margin: "0 0 14px",
            lineHeight: 1.5,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--surface)",
            border: "1px solid var(--border-light)",
          }}
        >
          {articleReferenceBridge(caseId, gender, articleType, revealAnswer)}
        </p>

        <div
          style={{
            padding: "12px",
            borderRadius: 12,
            border: `1px solid ${levelColor}44`,
            background: "color-mix(in srgb, var(--bg) 88%, transparent)",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: levelColor,
              margin: "0 0 10px",
            }}
          >
            Dieser Fall · {CASE_LABEL[caseId]}
          </p>
          <ArticleCaseRow
            caseId={caseId}
            articleType={articleType}
            highlightGender={revealAnswer ? gender : null}
            revealAnswer={revealAnswer}
          />
        </div>

        {otherCases.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowAllCases(v => !v)}
              style={{
                width: "100%",
                minHeight: 40,
                borderRadius: 10,
                border: "1px solid var(--border-light)",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                color: levelColor,
                cursor: "pointer",
                marginBottom: showAllCases ? 12 : 0,
              }}
            >
              {showAllCases ? "Weniger anzeigen ↑" : "Alle Fälle anzeigen ↓"}
            </button>

            {showAllCases && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                {otherCases.map(otherCase => (
                  <ArticleCaseRow
                    key={otherCase}
                    caseId={otherCase}
                    articleType={articleType}
                    compact
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
