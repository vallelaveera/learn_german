"use client";

import type { GenderArticle } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";

const ARTICLES: GenderArticle[] = ["der", "die", "das"];

interface GenderArticleTabsProps {
  value: GenderArticle;
  onChange: (article: GenderArticle) => void;
  inactiveBorder?: string;
  disabled?: GenderArticle[];
}

export function GenderArticleTabs({
  value,
  onChange,
  inactiveBorder = "var(--border-light)",
  disabled = [],
}: GenderArticleTabsProps) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
      {ARTICLES.map(article => {
        const active = value === article;
        const isDisabled = disabled.includes(article);
        const color = GENDER_ARTICLE_COLORS[article];
        return (
          <button
            key={article}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(article)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              border: active ? `2px solid ${color}` : `1.5px solid ${inactiveBorder}`,
              background: active ? `${color}18` : isDisabled ? "var(--bg-warm)" : "#fff",
              color,
              fontWeight: 800,
              fontSize: 14,
              cursor: isDisabled ? "default" : "pointer",
              opacity: isDisabled ? 0.45 : 1,
            }}
          >
            {article}
          </button>
        );
      })}
    </div>
  );
}
