"use client";
import Link from "next/link";
import { Message } from "@/lib/types";

export interface CallReportStats {
  durationLabel: string;
  sentenceCount: number;
  grammarScore: number;
  newWords: string[];
}

interface CallReportProps {
  messages: Message[];
  stats: CallReportStats;
  userName?: string;
  onCallAgain: () => void;
  onClose: () => void;
}

export function CallReport({ messages, stats, userName, onCallAgain, onClose }: CallReportProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          maxHeight: "92dvh",
          background: "var(--bg)",
          borderRadius: "16px 16px 0 0",
          padding: "20px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300, color: "var(--text)", margin: 0 }}>
            Bericht
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ minWidth: 44, minHeight: 44, background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Dauer", value: stats.durationLabel },
            { label: "Sätze", value: stats.sentenceCount },
            { label: "Grammatik", value: `${stats.grammarScore}%` },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {stats.newWords.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Neue Wörter
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {stats.newWords.map(w => (
                <Link
                  key={w}
                  href={`/words?highlight=${encodeURIComponent(w)}`}
                  style={{
                    background: "var(--accent-glow)",
                    border: "0.5px solid var(--accent-dim)",
                    color: "#7F77DD",
                    borderRadius: 20,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontFamily: "var(--font-serif)",
                    textDecoration: "none",
                    minHeight: 44,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {w}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Gespräch
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  maxWidth: "90%",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  marginLeft: msg.role === "user" ? "auto" : 0,
                  background: msg.role === "user" ? "linear-gradient(135deg, #7c4daa, #e8643a)" : "#f0ebff",
                  border: `0.5px solid ${msg.role === "user" ? "transparent" : "#ddd5f0"}`,
                }}
              >
                <div style={{ fontSize: 10, color: msg.role === "assistant" ? "#7c4daa" : "rgba(255,255,255,0.85)", textTransform: "uppercase", marginBottom: 3 }}>
                  {msg.role === "user" ? (userName ?? "Du") : "Maya"}
                </div>
                <p style={{ fontSize: 13, color: msg.role === "user" ? "#fff" : "#2d1f1a", lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
                {msg.correction && msg.role === "user" && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 6, fontStyle: "italic" }}>💡 {msg.correction}</p>
                )}
                {msg.translation && msg.role === "assistant" && (
                  <p style={{ fontSize: 11, color: "#7c4daa", marginTop: 6, fontStyle: "italic" }}>💡 {msg.translation}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={onCallAgain}
            style={{
              width: "100%",
              minHeight: 48,
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: "#7F77DD",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            Nochmal anrufen
          </button>
          <Link
            href="/mode"
            style={{
              width: "100%",
              minHeight: 48,
              padding: "14px",
              borderRadius: 14,
              border: "0.5px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 14,
              textAlign: "center",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            Fertig
          </Link>
        </div>
      </div>
    </div>
  );
}
