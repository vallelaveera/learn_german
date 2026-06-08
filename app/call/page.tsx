"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSpeechRecorder } from "@/components/SpeechRecorder";
import { AudioPlayer, fetchTTS } from "@/components/AudioPlayer";
import { Message, Session } from "@/lib/types";
import Link from "next/link";
import styles from "./call.module.css";

type CallState = "idle" | "listening" | "thinking" | "speaking";

const SONIOX_KEY =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "")
    : "";

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalBufferRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      finalBufferRef.current += text;
    } else {
      setLiveText(finalBufferRef.current + text);
    }
  }, []);

  const handleRecordingEnd = useCallback(async () => {
    const userText = finalBufferRef.current.trim();
    finalBufferRef.current = "";
    setLiveText("");

    if (!userText) {
      setCallState("idle");
      return;
    }

    const userMsg: Message = {
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    sendToTutor(updated);
    setCallState("thinking");
  }, []);

  const sendToTutor = async (msgs: Message[]) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.content,
        translation: data.translation,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCallState("speaking");

      // TTS
      const url = await fetchTTS(data.content);
      setAudioUrl(url);
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setCallState("idle");
    }
  };

  const { start, stop } = useSpeechRecorder({
    apiKey: SONIOX_KEY,
    onTranscript: handleTranscript,
    onEnd: handleRecordingEnd,
    onError: (e) => {
      setError(e);
      setCallState("idle");
    },
  });

  const handleCallButton = () => {
    if (callState === "idle") {
      setError(null);
      finalBufferRef.current = "";
      setCallState("listening");
      start();
    } else if (callState === "listening") {
      stop();
      // handleRecordingEnd fires via onEnd
    }
  };

  const handleTTSEnd = () => {
    setAudioUrl(null);
    setCallState("idle");
  };

  const saveSession = async () => {
    const session: Session = {
      id: sessionId,
      startedAt: sessionStart,
      endedAt: Date.now(),
      messages,
      title: messages[0]?.content?.slice(0, 60) ?? "Conversation",
    };
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
    setSaved(true);
  };

  const stateLabel: Record<CallState, string> = {
    idle: "Drücken zum Sprechen",
    listening: "Zuhören... (nochmal drücken zum Stoppen)",
    thinking: "Felix denkt nach...",
    speaking: "Felix spricht...",
  };

  return (
    <div className={styles.page}>
      <AudioPlayer audioUrl={audioUrl} onEnd={handleTTSEnd} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDE}>DE</span>
          <span className={styles.logoText}>Deutsch Tutor</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/history" className={styles.navLink}>
            Verlauf
          </Link>
          {messages.length > 0 && !saved && (
            <button className={styles.saveBtn} onClick={saveSession}>
              Speichern
            </button>
          )}
          {saved && <span className={styles.savedBadge}>✓ Gespeichert</span>}
        </nav>
      </header>

      {/* Main */}
      <main className={styles.main}>
        {/* Felix avatar area */}
        <div className={styles.avatarArea}>
          <div
            className={`${styles.avatar} ${
              callState === "speaking" ? styles.avatarSpeaking : ""
            }`}
          >
            <span className={styles.avatarInitial}>F</span>
            {callState === "speaking" && (
              <div className={styles.speakingRings}>
                <div className={styles.ring} style={{ animationDelay: "0s" }} />
                <div className={styles.ring} style={{ animationDelay: "0.3s" }} />
                <div className={styles.ring} style={{ animationDelay: "0.6s" }} />
              </div>
            )}
          </div>
          <p className={styles.felixLabel}>Felix — dein Deutschlehrer</p>
          <p className={styles.levelBadge}>B1/B2</p>
        </div>

        {/* Conversation */}
        <div className={styles.transcript}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Bereit zum Üben?</p>
              <p className={styles.emptyHint}>
                Drücke den Knopf und sprich auf Deutsch.<br />
                Felix antwortet und hilft dir mit der Grammatik.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.bubble} ${
                msg.role === "user" ? styles.userBubble : styles.assistantBubble
              }`}
            >
              <div className={styles.bubbleRole}>
                {msg.role === "user" ? "Du" : "Felix"}
              </div>
              <p className={styles.bubbleText}>{msg.content}</p>
              {msg.translation && (
                <p className={styles.bubbleHint}>💡 {msg.translation}</p>
              )}
              <span className={styles.bubbleTime}>
                {new Date(msg.timestamp).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {/* Live preview */}
          {liveText && (
            <div className={`${styles.bubble} ${styles.userBubble} ${styles.livePreview}`}>
              <div className={styles.bubbleRole}>Du</div>
              <p className={styles.bubbleText}>
                {liveText}
                <span className={styles.cursor} />
              </p>
            </div>
          )}

          {callState === "thinking" && (
            <div className={`${styles.bubble} ${styles.assistantBubble}`}>
              <div className={styles.bubbleRole}>Felix</div>
              <div className={styles.thinkingDots}>
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && <p className={styles.error}>{error}</p>}

        {/* Status */}
        <p className={styles.status}>{stateLabel[callState]}</p>

        {/* Call button */}
        <button
          className={`${styles.callBtn} ${
            callState === "listening" ? styles.callBtnActive : ""
          } ${callState === "thinking" || callState === "speaking" ? styles.callBtnDisabled : ""}`}
          onClick={handleCallButton}
          disabled={callState === "thinking" || callState === "speaking"}
          aria-label={callState === "listening" ? "Stop recording" : "Start speaking"}
        >
          {callState === "listening" ? (
            <WaveformIcon />
          ) : callState === "thinking" ? (
            <SpinnerIcon />
          ) : (
            <MicIcon />
          )}
        </button>
      </main>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg width="32" height="24" viewBox="0 0 32 24" fill="currentColor">
      {[4, 8, 12, 16, 20, 24, 28].map((x, i) => (
        <rect
          key={x}
          x={x - 2}
          y="2"
          width="3"
          height="20"
          rx="1.5"
          style={{
            animation: `wave 0.8s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        border: "2px solid rgba(255,255,255,0.2)",
        borderTopColor: "currentColor",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
