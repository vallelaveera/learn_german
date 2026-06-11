"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSpeechRecorder } from "@/components/SpeechRecorder";
import { Message } from "@/lib/types";
import { computeCallReportStats } from "@/lib/call-report-stats";
import { useRouter } from "next/navigation";
import styles from "@/app/call/call.module.css";

type CallState = "idle" | "listening" | "thinking" | "speaking";

export interface TippenCallProps {
  onCallEnded?: (messages: Message[], durationSec: number) => void;
  embedded?: boolean;
}

// ── Module-level guards — never stale ──────────────────────
let _isSending = false;

// ── Wake Lock ──────────────────────────────────────────────
function useWakeLock() {
  const ref = useRef<WakeLockSentinel | null>(null);
  const acquire = async () => {
    try { if ("wakeLock" in navigator) ref.current = await (navigator as any).wakeLock.request("screen"); } catch {}
  };
  const release = () => { ref.current?.release(); ref.current = null; };
  return { acquire, release };
}

export function TippenCall({ onCallEnded, embedded }: TippenCallProps = {}) {
  // ── State ────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [ttsProvider, setTtsProvider] = useState<"soniox" | "fish">("soniox");
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [user, setUser] = useState<{ name: string; streak: number } | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicQuestionShown, setTopicQuestionShown] = useState(false);
  const [showSilenceHint, setShowSilenceHint] = useState(false);
  const silenceHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [daysSince, setDaysSince] = useState(0);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState<number | null>(null);

  // ── Refs ─────────────────────────────────────────────────
  const finalBufferRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef(0);
  // startRef lets audio callbacks call start() without stale closure
  const startRef = useRef<() => void>(() => {});
  const pendingEndRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const router = useRouter();
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock();

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Auto scroll ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  // ── Load context on mount ────────────────────────────────
  useEffect(() => {
    fetch("/api/context")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        setSystemPrompt(data.systemPrompt);
        setUser({ name: data.user.name, streak: data.streak ?? 0 });
        if (data.topics) setTopics(data.topics);
        if (data.topicQuestion && data.topics?.length) {
          setTimeout(() => {
            const tqMsg: Message = {
              role: "assistant",
              content: data.topicQuestion,
              timestamp: Date.now() + 100,
            };
            setMessages(prev => [...prev, tqMsg]);
            setTopicQuestionShown(true);
          }, 3000);
        }
        setDaysSince(data.daysSinceLastCall ?? 0);
        if (data.opening) {
          const msg: Message = { role: "assistant", content: data.opening, timestamp: Date.now() };
          setMessages([msg]);
          setTimeout(() => streamTTSRef.current?.(data.opening), 500);
        }
      })
      .catch(console.error);
  }, []);

  // ── Audio ────────────────────────────────────────────────
  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const stopAudio = useCallback(() => {
    sourceQueueRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourceQueueRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  const playChunk = useCallback(async (chunk: ArrayBuffer) => {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    try {
      const decoded = await ctx.decodeAudioData(chunk.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startAt);
      nextStartTimeRef.current = startAt + decoded.duration;
      source.onended = () => {
        sourceQueueRef.current = sourceQueueRef.current.filter(s => s !== source);
        if (sourceQueueRef.current.length === 0) {
          setCallState("idle");
        }
      };
      sourceQueueRef.current.push(source);
    } catch {}
  }, []);

  const streamTTSRef = useRef<((text: string) => void) | null>(null);

  const streamTTS = useCallback(async (text: string) => {
    setCallState("speaking");
    stopAudio();
    nextStartTimeRef.current = 0;
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider: ttsProvider }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const CHUNK = 16384;
      let buf = new Uint8Array(0);
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buf.length > 0) playChunk(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
          break;
        }
        const nb = new Uint8Array(buf.length + value.length);
        nb.set(buf); nb.set(value, buf.length); buf = nb;
        if (buf.length >= CHUNK) {
          const tp = buf.slice(0, CHUNK); buf = buf.slice(CHUNK);
          playChunk(tp.buffer.slice(tp.byteOffset, tp.byteOffset + tp.byteLength));
        }
      }
    } catch { setCallState("idle"); }
  }, [playChunk, stopAudio, ttsProvider]);

  useEffect(() => { streamTTSRef.current = streamTTS; }, [streamTTS]);

  // ── Auto save ────────────────────────────────────────────
  const autoSave = useCallback((msgs: Message[]) => {
    const durationSec = Math.max(0, Math.round((Date.now() - sessionStart) / 1000));
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId, userId: "",
        startedAt: sessionStart, endedAt: Date.now(),
        messages: msgs,
        title: msgs.find(m => m.role === "user")?.content?.slice(0, 60) ?? "Gespraech",
        totalMessages: msgs.length,
        newWords: computeCallReportStats(msgs, durationSec).newWords,
      }),
    });
  }, [sessionId, sessionStart]);

  // ── Send to Claude ───────────────────────────────────────
  const sendToTutor = useCallback(async (msgs: Message[]) => {
    setCallState("thinking");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, systemPrompt }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const p = JSON.parse(data);
            if (p.type === "content_block_delta" && p.delta?.type === "text_delta") fullText += p.delta.text;
          } catch {}
        }
      }
      if (!fullText) throw new Error();
      const allLines = fullText.split("\n").filter(Boolean);
      const hint = allLines.find(l => l.startsWith("\u{1F4A1}"));
      const german = allLines.filter(l => !l.startsWith("\u{1F4A1}")).join(" ").trim();
      const assistantMsg: Message = {
        role: "assistant",
        content: german,
        translation: hint?.replace("\u{1F4A1} ", ""),
        timestamp: Date.now(),
      };
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        autoSave(updated);
        return updated;
      });
      _isSending = false;
      await streamTTS(german);
    } catch {
      _isSending = false;
      setError(null); // silently retry on timeout
      setCallState("idle");
    }
  }, [streamTTS, systemPrompt, autoSave]);

  // ── Speech callbacks ─────────────────────────────────────
  // Show silence hint after 2s of listening with no speech
  useEffect(() => {
    if (callState === "listening" && !liveText) {
      silenceHintTimerRef.current = setTimeout(() => setShowSilenceHint(true), 2000);
    } else {
      setShowSilenceHint(false);
      if (silenceHintTimerRef.current) clearTimeout(silenceHintTimerRef.current);
    }
    return () => { if (silenceHintTimerRef.current) clearTimeout(silenceHintTimerRef.current); };
  }, [callState, liveText]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) { finalBufferRef.current += text; setLiveText(finalBufferRef.current); }
    else setLiveText(finalBufferRef.current + text);
  }, []);

  const handleRecordingEnd = useCallback(() => {
    if (_isSending) return;
    setTopics([]); setTopicQuestionShown(false);
    const userText = finalBufferRef.current.trim();
    finalBufferRef.current = "";
    setLiveText("");
    if (!userText) { setCallState("idle"); return; }
    _isSending = true;
    const userMsg: Message = { role: "user", content: userText, timestamp: Date.now() };
    setMessages(prev => { const updated = [...prev, userMsg]; sendToTutor(updated); return updated; });
  }, [sendToTutor]);

  const { start, stop } = useSpeechRecorder({
    apiKey: process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "",
    onTranscript: handleTranscript,
    onEnd: handleRecordingEnd,
    onError: e => { setError(e); setCallState("idle"); },
    onVolume: () => {},
    onSpeechStart: () => setCallState("listening"),
  });

  // Keep startRef in sync — this is what playChunk uses
  useEffect(() => { startRef.current = start; }, [start]);

  const finishSession = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    _isSending = false;
    stop();
    stopAudio();
    setCallState("idle");
    releaseWakeLock();
    const dur = Math.max(0, Math.round((Date.now() - sessionStart) / 1000));
    const finalMessages = [...messagesRef.current];
    if (finalMessages.length > 1) {
      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: finalMessages }),
      }).catch(() => {});
      onCallEnded?.(finalMessages, dur);
    }
    setMessages([]);
    setLiveText("");
    finalBufferRef.current = "";
  }, [stop, stopAudio, releaseWakeLock, sessionStart, onCallEnded]);

  useEffect(() => {
    if (callState !== "idle") return;
    if (pendingEndRef.current) {
      pendingEndRef.current = false;
      finishSession();
    }
  }, [callState, finishSession]);

  const generateReport = () => {
    if (callState === "speaking" || callState === "thinking") {
      pendingEndRef.current = true;
      stopAudio();
      return;
    }
    finishSession();
  };

  const translateMessage = async (text: string, index: number) => {
    if (translations[index]) {
      setTranslations(prev => { const n = { ...prev }; delete n[index]; return n; });
      return;
    }
    setLoadingTranslation(index);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Translate to English: "${text}"` }],
          systemPrompt: "Translate German to English. Return only the translation.",
        }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(line.slice(6).trim());
            if (p.type === "content_block_delta" && p.delta?.type === "text_delta") result += p.delta.text;
          } catch {}
        }
      }
      setTranslations(prev => ({ ...prev, [index]: result.trim() }));
    } catch {}
    setLoadingTranslation(null);
  };

  // ── Normal mode button ───────────────────────────────────
  const handleNormalButton = async () => {
    if (navigator.vibrate) navigator.vibrate(40);
    if (callState === "idle") {
      setError(null);
      finalBufferRef.current = "";
      _isSending = false;
      setLiveText("");
      setCallState("listening");
      getAudioCtx();
      await acquireWakeLock();
      start();
    } else if (callState === "listening") {
      stop();
      // Don't clear buffer — handleRecordingEnd will read it and send
    } else if (callState === "speaking") {
      stopAudio();
      setCallState("idle");
    }
  };

  // ── Labels ───────────────────────────────────────────────
  const stateLabel: Record<CallState, string> = {
    idle: "Mikrofon starten",
    listening: "Sprich jetzt — tippen zum Senden",
    thinking: "Maya denkt nach...",
    speaking: "Maya spricht — tippen zum Stoppen",
  };

  const bars = Array.from({ length: 7 });

  return (
    <div className={styles.page}>

      {!embedded && (
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDE}>DE</span>
          <span className={styles.logoText}>CallMeDaily</span>
        </div>
        <nav className={styles.nav}>
          <a href="/mode" style={{ fontSize: 11, color: "var(--text-muted)", border: "0.5px solid var(--border)", padding: "6px 10px", borderRadius: 6 }}>← Modus</a>
          {messages.length > 1 && (
            <button className={styles.endBtn} onClick={generateReport}>
              {pendingEndRef.current ? "..." : "Ende"}
            </button>
          )}
        </nav>
      </header>
      )}

      {embedded && messages.length > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 18px 0" }}>
          <button
            type="button"
            onClick={generateReport}
            style={{ minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer" }}
          >
            {pendingEndRef.current ? "..." : "Ende"}
          </button>
        </div>
      )}

      {/* ── Maya row ── */}
      <div className={styles.avatarRow}>
        <div className={`${styles.avatar} ${callState === "speaking" ? styles.avatarSpeaking : ""}`}>
          <span className={styles.avatarInitial}>M</span>
          {callState === "speaking" && (
            <div className={styles.speakingRings}>
              <div className={styles.ring} style={{ animationDelay: "0s" }} />
              <div className={styles.ring} style={{ animationDelay: "0.4s" }} />
            </div>
          )}
        </div>
        <div className={styles.avatarInfo}>
          <div className={styles.avatarName}>Maya{user ? ` · ${user.name}` : ""}</div>
          <div className={styles.avatarSub}>
            {user?.streak ? `${user.streak} Tage` : "Deutschfreundin"}
            {daysSince >= 3 ? ` · ${daysSince}d Pause` : ""}
          </div>
        </div>
      </div>

      {/* ── Transcript ── */}
      <div className={styles.transcript}>


        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Hey{user ? ` ${user.name}` : ""}!</p>
            <p className={styles.emptyHint}>Tippe den Knopf und sprich Deutsch mit Maya.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}>
            <div className={styles.bubbleRole}>{msg.role === "user" ? (user?.name ?? "Du") : "Maya"}</div>
            <p className={styles.bubbleText}>{msg.content.replace(/<end>/g, "").trim()}</p>
            {msg.translation && <p className={styles.bubbleHint}>{msg.translation}</p>}
            {msg.role === "assistant" && (
              <div>
                <button
                  onClick={() => translateMessage(msg.content, i)}
                  style={{ fontSize: 10, color: translations[i] ? "var(--accent)" : "var(--text-dim)", border: "0.5px solid var(--border)", borderRadius: 4, padding: "2px 8px", marginTop: 6, cursor: "pointer", background: translations[i] ? "var(--accent-glow)" : "none", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
                >
                  {loadingTranslation === i ? "..." : translations[i] ? "DE" : "EN"}
                </button>
                {translations[i] && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>{translations[i]}</p>
                )}
              </div>
            )}
            <span className={styles.bubbleTime}>{new Date(msg.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        ))}
        {/* Topic chips inline */}
        {topicQuestionShown && topics.length > 0 && callState !== "thinking" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "4px 0 8px" }}>
            {topics.map((topic, i) => (
              <button key={i} onClick={() => {
                const msg = `Ich möchte heute über "${topic}" sprechen.`;
                const userMsg = { role: "user" as const, content: msg, timestamp: Date.now() };
                setMessages(prev => { const updated = [...prev, userMsg]; sendToTutor(updated); return updated; });
                setTopics([]); setTopicQuestionShown(false);
              }} style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 12,
                cursor: "pointer", fontFamily: "var(--font-mono)",
                background: "var(--accent-glow)", color: "var(--accent)",
                border: "0.5px solid var(--accent-dim)",
                WebkitTapHighlightColor: "transparent",
              }}>{topic}</button>
            ))}
            <button onClick={() => { setTopics([]); setTopicQuestionShown(false); }} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12,
              cursor: "pointer", fontFamily: "var(--font-mono)",
              background: "none", color: "var(--text-dim)",
              border: "0.5px solid var(--border)",
            }}>Einfach plaudern 💬</button>
          </div>
        )}

        {liveText && (
          <div className={`${styles.bubble} ${styles.userBubble} ${styles.livePreview}`}>
            <div className={styles.bubbleRole}>{user?.name ?? "Du"}</div>
            <p className={styles.bubbleText}>{liveText.replace(/<end>/g, "").trim()}<span className={styles.cursor} /></p>
          </div>
        )}
        {callState === "thinking" && (
          <div className={`${styles.bubble} ${styles.assistantBubble}`}>
            <div className={styles.bubbleRole}>Maya</div>
            <div className={styles.thinkingDots}><span /><span /><span /></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Bottom controls ── */}
      <div className={styles.bottom}>
        {error && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <p className={styles.error}>{error}</p>
            <a href="/mode" style={{ fontSize: 12, color: "var(--accent)", border: "0.5px solid var(--accent-dim)", padding: "6px 16px", borderRadius: 6, background: "var(--accent-glow)" }}>
              Modus wechseln →
            </a>
          </div>
        )}
        <p className={styles.status}>{stateLabel[callState]}</p>

        <button
          className={`${styles.callBtn} ${callState === "listening" ? styles.callBtnListening : ""} ${callState === "speaking" ? styles.callBtnSpeaking : ""} ${callState === "thinking" ? styles.callBtnThinking : ""}`}
          onClick={handleNormalButton}
          aria-label="Toggle call"
        >
          {callState === "listening" ? (
            <div className={styles.waveform}>
              {bars.map((_, i) => <div key={i} className={styles.bar} style={{ animationDelay: `${i * 0.08}s` }} />)}
            </div>
          ) : callState === "thinking" ? (
            <div className={styles.spinner} />
          ) : callState === "speaking" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
