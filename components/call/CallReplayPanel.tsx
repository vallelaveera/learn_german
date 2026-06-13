"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, VolumeX } from "lucide-react";
import type { Message } from "@/lib/types";
import {
  beginReplaySession,
  isReplaySessionActive,
  playAudioUrl,
  replayMessages,
  stopCallReplay,
  userMessagesWithAudio,
  type CallReplayMode,
} from "@/lib/call-replay";

interface CallReplayPanelProps {
  messages: Message[];
}

export function CallReplayPanel({ messages }: CallReplayPanelProps) {
  const userClips = userMessagesWithAudio(messages);
  const [mode, setMode] = useState<CallReplayMode>("user-only");
  const [playingAll, setPlayingAll] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const sessionRef = useRef<number | null>(null);

  const stopPlayback = useCallback(() => {
    stopCallReplay();
    sessionRef.current = null;
    setPlayingAll(false);
    setPlayingIndex(null);
  }, []);

  useEffect(() => () => stopCallReplay(), []);

  const playAll = useCallback(async () => {
    if (playingAll) {
      stopPlayback();
      return;
    }

    const session = beginReplaySession();
    sessionRef.current = session;
    setPlayingAll(true);

    try {
      if (mode === "user-only") {
        for (const msg of userClips) {
          if (!isReplaySessionActive(session) || !msg.audioUrl) break;
          setPlayingIndex(messages.indexOf(msg));
          await playAudioUrl(msg.audioUrl, session);
        }
      } else {
        await replayMessages(messages, "full", session);
      }
    } catch {
      /* ignore playback errors */
    } finally {
      if (sessionRef.current === session) {
        sessionRef.current = null;
        setPlayingAll(false);
        setPlayingIndex(null);
      }
    }
  }, [messages, mode, playingAll, stopPlayback, userClips]);

  const playOne = useCallback(async (msg: Message, index: number) => {
    if (!msg.audioUrl) return;
    if (playingAll) stopPlayback();

    const session = beginReplaySession();
    sessionRef.current = session;
    setPlayingIndex(index);

    try {
      await playAudioUrl(msg.audioUrl, session);
    } finally {
      if (sessionRef.current === session) {
        sessionRef.current = null;
        setPlayingIndex(null);
      }
    }
  }, [playingAll, stopPlayback]);

  const switchMode = useCallback((next: CallReplayMode) => {
    if (next === mode) return;
    stopPlayback();
    setMode(next);
  }, [mode, stopPlayback]);

  if (userClips.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "14px",
        borderRadius: 12,
        background: "#EEEDFE",
        border: "1px solid #AFA9EC",
      }}
    >
      <div style={{ fontSize: 11, color: "#534AB7", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Dich anhören
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(
          [
            ["user-only", "Nur ich"],
            ["full", "Mit Maya"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMode(id)}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: 8,
              border: mode === id ? "none" : "0.5px solid #AFA9EC",
              background: mode === id ? "#7F77DD" : "#fff",
              color: mode === id ? "#fff" : "#534AB7",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {id === "user-only" && <VolumeX size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />}
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void playAll()}
        style={{
          width: "100%",
          minHeight: 44,
          borderRadius: 10,
          border: "none",
          background: "#7F77DD",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {playingAll ? <Pause size={16} /> : <Play size={16} />}
        {playingAll ? "Stoppen" : mode === "user-only" ? "Alle Antworten abspielen" : "Ganzes Gespräch abspielen"}
      </button>

      <p style={{ fontSize: 10, color: "#534AB7", margin: "0 0 8px", lineHeight: 1.4 }}>
        Tippe ▶ neben einer Antwort für Einzelwiedergabe
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.map((msg, i) => {
          if (msg.role !== "user" || !msg.audioUrl) return null;
          const active = playingIndex === i;
          return (
            <div
              key={`${msg.timestamp}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: active ? "#fff" : "rgba(255,255,255,0.65)",
                border: "0.5px solid #ddd5f0",
              }}
            >
              <button
                type="button"
                aria-label="Antwort anhören"
                onClick={() => void playOne(msg, i)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: active ? "#7F77DD" : "#fff",
                  color: active ? "#fff" : "#7F77DD",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Play size={14} />
              </button>
              <p style={{ fontSize: 12, color: "var(--text)", margin: 0, lineHeight: 1.4, flex: 1 }}>
                {msg.content.replace(/<end>/g, "").trim()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
