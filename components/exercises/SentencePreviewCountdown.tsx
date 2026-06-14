"use client";

import { useEffect, useState } from "react";

interface SentencePreviewCountdownProps {
  totalSeconds: number;
  /** When true, the ring ticks down each second. */
  running: boolean;
  /** When true, ring stays full (e.g. while Maya speaks). */
  paused?: boolean;
  onComplete?: () => void;
  size?: number;
}

const RING = 44;
const STROKE = 4;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SentencePreviewCountdown({
  totalSeconds,
  running,
  paused = false,
  onComplete,
  size = 72,
}: SentencePreviewCountdownProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds, running, paused]);

  useEffect(() => {
    if (!running || paused || totalSeconds <= 0) return;

    setRemaining(totalSeconds);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const next = Math.max(0, totalSeconds - elapsed);
      setRemaining(next);
      if (next <= 0) {
        window.clearInterval(tick);
        onComplete?.();
      }
    }, 200);

    return () => window.clearInterval(tick);
  }, [running, paused, totalSeconds, onComplete]);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        marginBottom: 14,
      }}
      aria-live="polite"
      aria-label={
        paused
          ? "Maya spricht"
          : running
            ? `${remaining} Sekunden`
            : `${totalSeconds} Sekunden`
      }
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${RING} ${RING}`}
          style={{ transform: "rotate(-90deg)", display: "block", margin: "0 auto" }}
        >
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth={STROKE}
          />
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: paused ? "none" : "stroke-dashoffset 0.35s linear" }}
          />
        </svg>
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: size > 64 ? 20 : 16,
            fontWeight: 700,
            color: paused ? "var(--text-muted)" : "var(--accent)",
          }}
        >
          {paused ? "♪" : remaining}
        </span>
      </div>
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {paused ? "Maya spricht…" : running ? "Merken" : `${totalSeconds} Sek.`}
      </span>
    </div>
  );
}
