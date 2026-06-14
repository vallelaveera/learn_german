"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { BuildTenseId, TenseDef, VerbDef, VerbId } from "@/constants/germanTenses";
import type { TenseTabTheme } from "@/lib/tenses/theme";

interface TenseVerbPickersProps {
  theme: TenseTabTheme;
  tenses: TenseDef[];
  verbs: VerbDef[];
  tenseId: BuildTenseId;
  verbId: VerbId;
  onTenseChange: (id: BuildTenseId) => void;
  onVerbChange: (id: VerbId) => void;
}

const bubbleStyle: React.CSSProperties = {
  padding: "8px 10px",
  marginBottom: 10,
  borderRadius: 14,
  border: "1px solid var(--border-light)",
  background: "#fff",
};

export function TenseVerbPickers({
  theme,
  tenses,
  verbs,
  tenseId,
  verbId,
  onTenseChange,
  onVerbChange,
}: TenseVerbPickersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(false);

  const updateScrollHint = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollHint();
    el.addEventListener("scroll", updateScrollHint);
    const ro = new ResizeObserver(updateScrollHint);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollHint);
      ro.disconnect();
    };
  }, [verbs, updateScrollHint]);

  const scrollVerbs = () => {
    scrollRef.current?.scrollBy({ left: 140, behavior: "smooth" });
  };

  return (
    <>
      <div style={bubbleStyle}>
        <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: theme.tmid, letterSpacing: "0.04em" }}>
          ZEITFORM
        </p>
        <div style={{ display: "flex", flexWrap: "nowrap", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          {tenses.map(t => {
            const active = tenseId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTenseChange(t.id)}
                style={{
                  flexShrink: 0,
                  minHeight: 32,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: active ? `2px solid ${t.color}` : `1px solid ${theme.tbd}`,
                  background: active ? `${t.color}14` : "#fafafa",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: active ? t.color : "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {t.short}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ ...bubbleStyle, position: "relative" }}>
        <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: theme.tmid, letterSpacing: "0.04em" }}>
          VERBEN
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            ref={scrollRef}
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 6,
              overflowX: "auto",
              flex: 1,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {verbs.map(v => {
              const active = verbId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVerbChange(v.id)}
                  style={{
                    flexShrink: 0,
                    minHeight: 32,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: active ? `2px solid ${theme.tc}` : `1px solid ${theme.tbd}`,
                    background: active ? theme.tbg : "#fafafa",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {v.emoji} {v.infinitive}
                </button>
              );
            })}
          </div>
          {showMore && (
            <button
              type="button"
              aria-label="Mehr Verben"
              onClick={scrollVerbs}
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: 999,
                border: `1px solid ${theme.tbd}`,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: theme.tc,
              }}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
