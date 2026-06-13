"use client";

import { useCallback, useRef, useState } from "react";
import type { GenderArticle, GenderNoun } from "@/lib/gender/types";
import { GENDER_ARTICLE_COLORS } from "@/lib/gender/theme";

interface GenderArticleDragSortProps {
  words: GenderNoun[];
  zones: Record<string, GenderArticle | null>;
  onAssign: (wordId: string, article: GenderArticle | null) => void;
  checked?: boolean;
  results?: Record<string, boolean>;
  disabled?: boolean;
}

function WordChip({
  word,
  draggable,
  onDragStart,
  onDragEnd,
  onPointerDown,
  border,
  background,
  opacity = 1,
}: {
  word: GenderNoun;
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  border: string;
  background: string;
  opacity?: number;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      style={{
        minHeight: 44,
        padding: "8px 12px",
        borderRadius: 12,
        border,
        background,
        opacity,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        cursor: draggable ? "grab" : "default",
        touchAction: draggable ? "none" : "auto",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span>{word.emoji}</span>
      <span>{word.word}</span>
    </div>
  );
}

export function GenderArticleDragSort({
  words,
  zones,
  onAssign,
  checked = false,
  results = {},
  disabled = false,
}: GenderArticleDragSortProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const zoneRefs = useRef<Partial<Record<GenderArticle, HTMLDivElement | null>>>({});
  const poolRef = useRef<HTMLDivElement | null>(null);

  const unassigned = words.filter(w => !zones[w.id]);
  const canDrag = !disabled && !checked;

  const assignAtPoint = useCallback(
    (clientX: number, clientY: number, wordId: string) => {
      for (const article of ["der", "die", "das"] as const) {
        const el = zoneRefs.current[article];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          onAssign(wordId, article);
          return;
        }
      }
      const pool = poolRef.current;
      if (pool) {
        const rect = pool.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          onAssign(wordId, null);
        }
      }
    },
    [onAssign],
  );

  const startPointerDrag = (wordId: string, e: React.PointerEvent) => {
    if (!canDrag) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDraggingId(wordId);
    setGhostPos({ x: e.clientX, y: e.clientY });

    const onMove = (ev: PointerEvent) => {
      setGhostPos({ x: ev.clientX, y: ev.clientY });
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      assignAtPoint(ev.clientX, ev.clientY, wordId);
      setDraggingId(null);
      setGhostPos(null);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const handleDragStart = (wordId: string, e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", wordId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(wordId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleZoneDrop = (article: GenderArticle, e: React.DragEvent) => {
    e.preventDefault();
    if (!canDrag) return;
    const wordId = e.dataTransfer.getData("text/plain");
    if (wordId) onAssign(wordId, article);
    setDraggingId(null);
  };

  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canDrag) return;
    const wordId = e.dataTransfer.getData("text/plain");
    if (wordId) onAssign(wordId, null);
    setDraggingId(null);
  };

  const chipStyle = (word: GenderNoun, inZone?: GenderArticle) => {
    if (checked) {
      const ok = results[word.id];
      return {
        border: `2px solid ${ok ? "var(--green)" : "var(--red)"}`,
        background: ok ? "rgba(56, 161, 105, 0.12)" : "rgba(224, 90, 74, 0.1)",
      };
    }
    if (draggingId === word.id) {
      return { border: `2px dashed ${themeFor(inZone)}`, background: "#fff", opacity: 0.35 };
    }
    return { border: "1.5px solid rgba(0,0,0,0.1)", background: "#fff", opacity: 1 };
  };

  function themeFor(article?: GenderArticle) {
    return article ? GENDER_ARTICLE_COLORS[article] : "#888";
  }

  const draggingWord = draggingId ? words.find(w => w.id === draggingId) : null;

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
        Ziehe Wörter in der · die · das
      </p>

      <div
        ref={poolRef}
        onDragOver={e => canDrag && e.preventDefault()}
        onDrop={handlePoolDrop}
        style={{
          minHeight: 56,
          padding: 10,
          borderRadius: 12,
          border: `1.5px dashed rgba(0,0,0,0.12)`,
          background: "rgba(255,255,255,0.6)",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {unassigned.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-dim)", padding: 8 }}>Alle Wörter sortiert</span>
        ) : (
          unassigned.map(w => {
            const style = chipStyle(w);
            return (
              <WordChip
                key={w.id}
                word={w}
                draggable={canDrag}
                onDragStart={e => handleDragStart(w.id, e)}
                onDragEnd={handleDragEnd}
                onPointerDown={e => startPointerDrag(w.id, e)}
                border={style.border}
                background={style.background}
                opacity={style.opacity}
              />
            );
          })
        )}
      </div>

      {(["der", "die", "das"] as const).map(article => {
        const color = GENDER_ARTICLE_COLORS[article];
        const inZone = words.filter(w => zones[w.id] === article);
        return (
          <div
            key={article}
            ref={el => {
              zoneRefs.current[article] = el;
            }}
            onDragOver={e => {
              if (canDrag) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={e => handleZoneDrop(article, e)}
            style={{
              minHeight: 56,
              borderRadius: 12,
              border: `2px solid ${color}`,
              background: `${color}14`,
              padding: "8px 12px",
              marginBottom: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span
              style={{
                fontWeight: 800,
                color,
                fontSize: 16,
                minWidth: 36,
                paddingTop: 6,
              }}
            >
              {article}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
              {inZone.map(w => {
                const style = chipStyle(w, article);
                return (
                  <WordChip
                    key={w.id}
                    word={w}
                    draggable={canDrag}
                    onDragStart={e => handleDragStart(w.id, e)}
                    onDragEnd={handleDragEnd}
                    onPointerDown={e => startPointerDrag(w.id, e)}
                    border={style.border}
                    background={style.background}
                    opacity={style.opacity}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {draggingWord && ghostPos && (
        <div
          style={{
            position: "fixed",
            left: ghostPos.x,
            top: ghostPos.y,
            transform: "translate(-50%, -50%)",
            zIndex: 200,
            pointerEvents: "none",
            minHeight: 44,
            padding: "8px 12px",
            borderRadius: 12,
            border: "2px solid var(--accent)",
            background: "#fff",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>{draggingWord.emoji}</span>
          <span>{draggingWord.word}</span>
        </div>
      )}
    </div>
  );
}
