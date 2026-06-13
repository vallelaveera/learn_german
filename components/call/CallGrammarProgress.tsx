"use client";

import type { Message } from "@/lib/types";
import {
  computeLiveGrammarProgress,
  getGrammarTurnInfo,
  grammarScoreColor,
  type GrammarTurnStatus,
} from "@/lib/call-grammar-progress";

interface CallGrammarProgressHudProps {
  messages: Message[];
  compact?: boolean;
}

export function CallGrammarProgressHud({ messages, compact = false }: CallGrammarProgressHudProps) {
  const progress = computeLiveGrammarProgress(messages);
  if (progress.total === 0) return null;

  const color = grammarScoreColor(progress.score);
  const pct = progress.score ?? 0;
  const fill = progress.evaluated > 0 ? pct : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: compact ? 72 : 88 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 9, color: "#8a7060", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Grammatik
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>
          {progress.score !== null ? `${progress.score}%` : "—"}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${fill}%`,
            borderRadius: 999,
            background: color,
            transition: "width 0.35s ease, background 0.25s ease",
          }}
        />
      </div>
      {!compact && progress.evaluated > 0 && (
        <span style={{ fontSize: 9, color: "#8a7060", fontFamily: "var(--font-mono)" }}>
          {progress.correct}✓ · {progress.corrected}💡
          {progress.pending > 0 ? ` · ${progress.pending}…` : ""}
        </span>
      )}
    </div>
  );
}

interface CallGrammarTurnBadgeProps {
  msg: Message;
  inverted?: boolean;
}

const STATUS_STYLE: Record<GrammarTurnStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", label: "…" },
  correct: { bg: "rgba(29,158,117,0.2)", color: "#1D9E75", label: "✓" },
  corrected: { bg: "rgba(226,75,74,0.15)", color: "#E24B4A", label: "💡" },
};

export function CallGrammarTurnBadge({ msg, inverted = false }: CallGrammarTurnBadgeProps) {
  if (msg.role !== "user") return null;
  const info = getGrammarTurnInfo(msg);
  const style = STATUS_STYLE[info.status];
  const pendingStyle = inverted
    ? { bg: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }
    : { bg: "var(--surface)", color: "var(--text-muted)" };
  const correctStyle = inverted
    ? { bg: "rgba(255,255,255,0.25)", color: "#fff" }
    : { bg: "#EAF3DE", color: "#1D9E75" };
  const correctedStyle = inverted
    ? { bg: "rgba(255,255,255,0.2)", color: "#fff" }
    : { bg: "#FCEBEB", color: "#E24B4A" };

  const colors =
    info.status === "pending" ? pendingStyle :
    info.status === "correct" ? correctStyle :
    correctedStyle;

  return (
    <div style={{ marginTop: 8 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.04em",
          padding: "3px 8px",
          borderRadius: 999,
          background: colors.bg,
          color: colors.color,
        }}
      >
        {info.status === "pending" && "Wird geprüft…"}
        {info.status === "correct" && "✓ Grammatik ok"}
        {info.status === "corrected" && "💡 Korrektur"}
      </span>
      {info.status === "corrected" && info.correctForm && (
        <p
          style={{
            fontSize: 11,
            margin: "6px 0 0",
            lineHeight: 1.45,
            color: inverted ? "rgba(255,255,255,0.92)" : "#501313",
            fontStyle: "italic",
          }}
        >
          Besser: {info.correctForm}
          {info.note ? ` — ${info.note}` : ""}
        </p>
      )}
    </div>
  );
}

interface CallGrammarTurnStripProps {
  messages: Message[];
  onTurnClick?: (messageIndex: number) => void;
  activeMessageIndex?: number | null;
}

export function CallGrammarTurnStrip({ messages, onTurnClick, activeMessageIndex = null }: CallGrammarTurnStripProps) {
  const userTurns = messages
    .map((msg, messageIndex) => ({ msg, messageIndex }))
    .filter(({ msg }) => msg.role === "user");
  if (userTurns.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Antwort für Antwort
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {userTurns.map(({ msg, messageIndex }, i) => {
          const info = getGrammarTurnInfo(msg);
          const bg =
            info.status === "correct" ? "#EAF3DE" :
            info.status === "corrected" ? "#FCEBEB" :
            "#F1EFE8";
          const color =
            info.status === "correct" ? "#1D9E75" :
            info.status === "corrected" ? "#E24B4A" :
            "var(--text-muted)";
          const symbol =
            info.status === "correct" ? "✓" :
            info.status === "corrected" ? "💡" :
            "…";
          const isActive = activeMessageIndex === messageIndex;
          const label =
            info.status === "correct" ? `Richtig — Antwort ${i + 1}` :
            info.status === "corrected" ? `Korrektur — Antwort ${i + 1}` :
            `Antwort ${i + 1}`;
          return (
            <button
              key={`${msg.timestamp}-${messageIndex}`}
              type="button"
              title={msg.content.replace(/<end>/g, "").trim()}
              aria-label={label}
              onClick={() => onTurnClick?.(messageIndex)}
              style={{
                minWidth: 36,
                height: 36,
                borderRadius: 10,
                background: bg,
                border: isActive ? "2px solid #7F77DD" : "0.5px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color,
                fontWeight: 700,
                cursor: onTurnClick ? "pointer" : "default",
                padding: 0,
                boxShadow: isActive ? "0 0 0 2px rgba(127, 119, 221, 0.2)" : undefined,
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <span>{symbol}</span>
              <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.8 }}>{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
