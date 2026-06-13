"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Message } from "@/lib/types";
import { nextGermanLevel } from "@/lib/levels";
import { beginReplaySession, playAudioUrl, revokeMessageAudioUrls, stopCallReplay } from "@/lib/call-replay";
import { SuccessIllustration } from "@/components/illustrations/SuccessIllustration";
import { CallReplayPanel } from "@/components/call/CallReplayPanel";
import { CallGrammarTurnBadge, CallGrammarTurnStrip } from "@/components/call/CallGrammarProgress";
import { grammarScoreColor } from "@/lib/call-grammar-progress";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";

export interface CallReportStats {
  durationLabel: string;
  sentenceCount: number;
  grammarScore: number;
  corrections: { said: string; correct: string; note?: string }[];
  /** @deprecated */
  newWords?: string[];
}

interface CallReportProps {
  messages: Message[];
  stats: CallReportStats;
  userName?: string;
  currentLevel?: string;
  completedCalls?: number;
  callMode?: string;
  onCallAgain: () => void;
  onClose: () => void;
}

export function CallReport({
  messages,
  stats,
  userName,
  currentLevel = "A1",
  completedCalls = 0,
  callMode,
  onCallAgain,
  onClose,
}: CallReportProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [levelConfirmed, setLevelConfirmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToMessage = useCallback((messageIndex: number) => {
    const el = messageRefs.current[messageIndex];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedIndex(messageIndex);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedIndex(null), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      stopCallReplay();
      revokeMessageAudioUrls(messages);
    };
  }, [messages]);

  const suggestedLevel = nextGermanLevel(currentLevel);
  const showLevelSuggestion =
    !dismissed &&
    !levelConfirmed &&
    completedCalls > 0 &&
    completedCalls % 3 === 0 &&
    suggestedLevel !== null;

  const acceptLevel = async () => {
    if (!suggestedLevel) return;
    setUpdating(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ germanLevel: suggestedLevel }),
      });
      setLevelConfirmed(true);
    } finally {
      setUpdating(false);
    }
  };
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
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "20px 18px 16px",
          }}
        >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 8 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300, color: "var(--text)", margin: 0 }}>
            Bericht
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!feedbackDone && (
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(127, 119, 221, 0.35)",
                  background: "rgba(127, 119, 221, 0.08)",
                  color: "#7F77DD",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Feedback
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ minWidth: 44, minHeight: 44, background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <SuccessIllustration width={180} height={180} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Dauer", value: stats.durationLabel },
            { label: "Sätze", value: stats.sentenceCount },
            { label: "Grammatik", value: `${stats.grammarScore}%`, color: grammarScoreColor(stats.grammarScore) },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "color" in s && s.color ? s.color : "var(--accent)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {showLevelSuggestion && suggestedLevel && (
          <div style={{
            marginBottom: 20,
            padding: "14px 16px",
            borderRadius: 12,
            background: "#EEEDFE",
            border: "1.5px solid #7F77DD",
          }}>
            {levelConfirmed ? (
              <p style={{ fontSize: 14, color: "#7F77DD", margin: 0, textAlign: "center" }}>
                Level auf {suggestedLevel} angepasst ✓
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "var(--text)", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Maya denkt, du bist bereit für {suggestedLevel}. Möchtest du dein Level anpassen?
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={acceptLevel}
                    disabled={updating}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 10,
                      border: "none",
                      background: "#7F77DD",
                      color: "#fff",
                      fontSize: 14,
                      cursor: updating ? "wait" : "pointer",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {updating ? "..." : "Ja, anpassen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 10,
                      border: "0.5px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-muted)",
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Nein, danke
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {stats.corrections.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Deine Fehler — zum Üben
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.corrections.map((c, i) => (
                <div
                  key={`${c.said}-${i}`}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--surface)",
                    border: "0.5px solid var(--border)",
                  }}
                >
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px", lineHeight: 1.4 }}>
                    Du sagtest: <span style={{ fontStyle: "italic" }}>{c.said}</span>
                  </p>
                  <p style={{ fontSize: 14, fontFamily: "var(--font-serif)", color: "var(--text)", margin: 0, lineHeight: 1.45 }}>
                    ✓ {c.correct}
                  </p>
                  {c.note && (
                    <p style={{ fontSize: 11, color: "var(--accent)", margin: "6px 0 0", fontStyle: "italic" }}>
                      💡 {c.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/exercises/sentences?source=call"
              style={{
                display: "inline-flex",
                marginTop: 12,
                fontSize: 13,
                color: "#7F77DD",
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
              }}
            >
              Sätze üben →
            </Link>
          </div>
        )}

        <CallReplayPanel messages={messages} />

        <CallGrammarTurnStrip
          messages={messages}
          onTurnClick={scrollToMessage}
          activeMessageIndex={highlightedIndex}
        />

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Gespräch
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                ref={el => { messageRefs.current[i] = el; }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  maxWidth: "90%",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  marginLeft: msg.role === "user" ? "auto" : 0,
                  background: msg.role === "user" ? "linear-gradient(135deg, #7c4daa, #e8643a)" : "#f0ebff",
                  border:
                    highlightedIndex === i
                      ? "2px solid #7F77DD"
                      : `0.5px solid ${msg.role === "user" ? "transparent" : "#ddd5f0"}`,
                  boxShadow: highlightedIndex === i ? "0 0 0 3px rgba(127, 119, 221, 0.18)" : undefined,
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                {msg.role === "user" && msg.audioUrl && (
                  <button
                    type="button"
                    aria-label="Antwort anhören"
                    onClick={() => {
                      if (!msg.audioUrl) return;
                      const session = beginReplaySession();
                      setPlayingIndex(i);
                      void playAudioUrl(msg.audioUrl, session).finally(() => {
                        setPlayingIndex(prev => (prev === i ? null : prev));
                      });
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "none",
                      background: playingIndex === i ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginTop: 14,
                    }}
                  >
                    <Play size={12} />
                  </button>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: msg.role === "assistant" ? "#7c4daa" : "rgba(255,255,255,0.85)", textTransform: "uppercase", marginBottom: 3 }}>
                  {msg.role === "user" ? (userName ?? "Du") : "Maya"}
                </div>
                <p style={{ fontSize: 13, color: msg.role === "user" ? "#fff" : "#2d1f1a", lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
                {msg.role === "user" && <CallGrammarTurnBadge msg={msg} inverted />}
                {msg.correction && msg.role === "user" && !msg.grammarEvaluated && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 6, fontStyle: "italic" }}>💡 {msg.correction}</p>
                )}
                {msg.translation && msg.role === "assistant" && (
                  <p style={{ fontSize: 11, color: "#7c4daa", marginTop: 6, fontStyle: "italic" }}>💡 {msg.translation}</p>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--border)",
            background: "var(--bg)",
            padding: "12px 18px calc(env(safe-area-inset-bottom, 0px) + 16px)",
          }}
        >
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

      <FeedbackSheet
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        source="post_call"
        callMode={callMode}
        onSubmitted={() => {
          setFeedbackDone(true);
          setFeedbackOpen(false);
        }}
      />
    </div>
  );
}
