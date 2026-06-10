"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useCallRecorder } from "@/components/CallRecorder";
import { Message } from "@/lib/types";

// ── Module-level flags ─────────────────────────────────────
let _cm_sending = false;
let _cm_active = false;
let _cm_mic_start = 0;

const SILENCE_THRESHOLD = 25; // volume below this = silence
const SILENCE_DURATION = 2000; // ms before auto-send
const MIC_WARMUP_MS = 1000; // wait before allowing silence detection

type Phase = "idle" | "active" | "ended";
type CallState = "listening" | "thinking" | "speaking";

export default function CallModePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [callState, setCallState] = useState<CallState>("listening");
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const ttsProviderRef = useRef<"soniox" | "fish">("soniox");
  useEffect(() => {
    const voice = (localStorage.getItem("maya_voice") ?? "soniox") as "soniox" | "fish";
    ttsProviderRef.current = voice;
  }, []);

  useEffect(() => {
    const voice = localStorage.getItem("maya_voice") ?? "soniox";
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicQuestionShown, setTopicQuestionShown] = useState(false);
  const [showSilenceHint, setShowSilenceHint] = useState(false);
  const silenceHintRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());

  // Refs
  const speechBufferRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const systemPromptRef = useRef<string | undefined>();
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const pendingTopicQuestionRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveText]);

  // Load user + context
  useEffect(() => {
    fetch("/api/context")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        if (data.limitReached) {
          setLimitReached(true);
          setUser({ name: data.user.name });
          return;
        }
        setUser({ name: data.user.name });
        systemPromptRef.current = data.systemPrompt;
        if (data.topics) setTopics(data.topics);
        if (data.usage) setUsage(data.usage);
        // Show topic question after opening TTS finishes
        // Store topic question to speak after opening finishes
        if (data.topicQuestion) {
          pendingTopicQuestionRef.current = data.topicQuestion;
        }
      });
  }, []);

  // ── Audio playback ─────────────────────────────────────
  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const stopAudio = useCallback(() => {
    sourceQueueRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourceQueueRef.current = [];
    nextStartRef.current = 0;
  }, []);

  const startRef = useRef<() => Promise<void>>(async () => {});
  const stopRef = useRef<() => void>(() => {});

  const playChunk = useCallback(async (chunk: ArrayBuffer) => {
    const ctx = getAudioCtx();
    // iOS: always resume before playing
    if (ctx.state === "suspended") await ctx.resume();
    try {
      const decoded = await ctx.decodeAudioData(chunk.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime, nextStartRef.current);
      source.start(startAt);
      nextStartRef.current = startAt + decoded.duration;
      source.onended = () => {
        sourceQueueRef.current = sourceQueueRef.current.filter(s => s !== source);
        if (sourceQueueRef.current.length === 0 && _cm_active) {
          // Maya finished speaking — restart mic
          setCallState("listening");
          _cm_sending = false;
          speechBufferRef.current = "";
          setTimeout(() => {
            if (_cm_active) startRef.current();
          }, 400);
        }
      };
      sourceQueueRef.current.push(source);
    } catch (e) {
      console.error("playChunk error:", e);
      // Even if decode fails, restart mic
      if (_cm_active && sourceQueueRef.current.length === 0) {
        setCallState("listening");
        _cm_sending = false;
        speechBufferRef.current = "";
        setTimeout(() => { if (_cm_active) startRef.current(); }, 400);
      }
    }
  }, []);

  // ── TTS ───────────────────────────────────────────────
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

  const streamTTS = useCallback(async (text: string) => {
    setCallState("speaking");
    stopAudio();
    nextStartRef.current = 0;
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider: ttsProviderRef.current }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();

      // Collect full audio then play — works on all platforms
      let buf = new Uint8Array(0);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const nb = new Uint8Array(buf.length + value.length);
        nb.set(buf); nb.set(value, buf.length); buf = nb;
      }
      if (buf.length > 0) {
        await playChunk(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      }
    } catch (e) {
      console.error("TTS error:", e);
      setCallState("listening");
      _cm_sending = false;
      if (_cm_active) startRef.current();
    }
  }, [playChunk, stopAudio, isIOS]);

  // ── Send to Claude ────────────────────────────────────
  const sendToTutor = useCallback(async (text: string) => {
    if (!text.trim() || _cm_sending) return;
    _cm_sending = true;
    setCallState("thinking");
    setShowSilenceHint(false);
    if (silenceHintRef.current) { clearTimeout(silenceHintRef.current); silenceHintRef.current = null; }
    setLiveText("");

    const userMsg: Message = { role: "user", content: text.replace(/<end>/g, "").trim(), timestamp: Date.now() };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;

    // Auto-save
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId, userId: "",
        startedAt: sessionStart, endedAt: Date.now(),
        messages: updated,
        title: updated.find(m => m.role === "user")?.content?.slice(0, 60) ?? "Gespraech",
        totalMessages: updated.length,
      }),
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, systemPrompt: systemPromptRef.current }),
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
      const german = allLines.filter(l => !l.startsWith("💡")).join(" ").trim();
      const hint = allLines.find(l => l.startsWith("💡"));
      const assistantMsg: Message = {
        role: "assistant",
        content: german,
        translation: hint?.replace("💡 ", ""),
        timestamp: Date.now(),
      };
      const withAssistant = [...messagesRef.current, assistantMsg];
      setMessages(withAssistant);
      messagesRef.current = withAssistant;
      await streamTTS(german);
    } catch {
      _cm_sending = false;
      setCallState("listening");
      if (_cm_active) startRef.current();
    }
  }, [streamTTS, sessionId, sessionStart]);

  // ── VAD — silence detection ───────────────────────────
  const handleVolume = useCallback((vol: number) => {
    setVolume(vol);
    if (!_cm_active || _cm_sending) return;
    if (Date.now() - _cm_mic_start < MIC_WARMUP_MS) return; // warmup period

    // Show silence hint after 2s of no speech
    if (vol < SILENCE_THRESHOLD) {
      if (!silenceHintRef.current && !speechBufferRef.current) {
        silenceHintRef.current = setTimeout(() => {
          setShowSilenceHint(true);
        }, 2000);
      }
    } else {
      // User is speaking — hide hint
      setShowSilenceHint(false);
      if (silenceHintRef.current) {
        clearTimeout(silenceHintRef.current);
        silenceHintRef.current = null;
      }
    }

    if (vol > SILENCE_THRESHOLD) {
      // User is speaking — cancel silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      // Silence — start timer if we have speech
      if (speechBufferRef.current.trim() && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          const text = speechBufferRef.current.trim();
          if (text && !_cm_sending) {
            speechBufferRef.current = "";
            stopRef.current();
            sendToTutor(text);
          }
        }, SILENCE_DURATION);
      }
    }
  }, [sendToTutor]);

  // ── Transcript callbacks ──────────────────────────────
  const nonFinalRef = useRef("");

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      speechBufferRef.current += text;
      nonFinalRef.current = "";
      setLiveText(speechBufferRef.current);
    } else {
      nonFinalRef.current = text;
      setLiveText(speechBufferRef.current + text);
    }
  }, []);

  const handleFinished = useCallback(() => {
    // Soniox finished — but we use VAD silence timer, not this
    // so nothing to do here
  }, []);

  // Pass last Maya message as context to Soniox for better accuracy
  const getContext = useCallback(() => {
    const lastMaya = [...messagesRef.current].reverse().find(m => m.role === "assistant");
    return lastMaya?.content ?? "";
  }, []);

  const { start, stop, audioCtxRef: recorderAudioCtxRef } = useCallRecorder({
    apiKey: process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "",
    onTranscript: handleTranscript,
    onFinished: handleFinished,
    onError: (e) => setError(e),
    onVolume: handleVolume,
    getContext,
  });

  // Keep refs in sync
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { stopRef.current = stop; }, [stop]);

  // ── Start call ────────────────────────────────────────
  const startCall = async () => {
    if (navigator.vibrate) navigator.vibrate(40);

    // iOS CRITICAL: Create AND resume AudioContext directly on user gesture
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    // Share AudioContext with recorder (iOS needs same context)
    recorderAudioCtxRef.current = audioCtxRef.current;

    _cm_active = true;
    _cm_sending = false;
    _cm_mic_start = Date.now();
    speechBufferRef.current = "";
    setError(null);
    setMessages([]);
    setLiveText("");
    setDuration(0);

    try {
      if ("wakeLock" in navigator) await (navigator as any).wakeLock.request("screen");
    } catch {}

    await start();
    setCallState("listening");

    durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    // Load Maya's opening
    fetch("/api/context")
      .then(r => r.json())
      .then(data => {
        if (data?.opening) {
          const msg: Message = { role: "assistant", content: data.opening, timestamp: Date.now() };
          setMessages([msg]);
          messagesRef.current = [msg];
          stop(); // pause mic while Maya speaks opening
          streamTTS(data.opening);
        }
      });

    setPhase("active");
  };

  // ── End call ──────────────────────────────────────────
  const endCall = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    _cm_active = false;
    _cm_sending = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (silenceHintRef.current) clearTimeout(silenceHintRef.current);
    stop();
    stopAudio();
    if (durationRef.current) clearInterval(durationRef.current);

    if (messagesRef.current.length > 1) {
      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesRef.current, sessionStart, sessionEnd: Date.now() }),
      });
    }
    setPhase("ended");
  }, [stop, stopAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _cm_active = false;
      stop();
      stopAudio();
      if (durationRef.current) clearInterval(durationRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (silenceHintRef.current) clearTimeout(silenceHintRef.current);
    };
  }, [stop, stopAudio]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── IDLE ──────────────────────────────────────────────
  if (phase === "idle") return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", paddingTop: "calc(env(safe-area-inset-top,0px) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--accent)", color: "var(--bg)", padding: "2px 6px", borderRadius: 3 }}>DE</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300, color: "var(--text)" }}>CallMeDaily</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.06em" }}>CALL MODE · FREIHÄNDIG</p>
      </div>

      <div style={{ position: "relative", marginBottom: 32 }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 42, color: "var(--accent)" }}>M</span>
        </div>
        <div style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "var(--green)", border: "2px solid var(--bg)" }} />
      </div>

      <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300, color: "var(--text)", marginBottom: 8 }}>
        Maya ruft an{user ? `, ${user.name}` : ""}
      </p>
      <p style={{ fontSize: 12, color: "#8a7060", marginBottom: 48, textAlign: "center", lineHeight: 1.7, maxWidth: 280 }}>
        Sprich einfach — Maya hört automatisch zu und antwortet wenn du fertig bist
      </p>

      <button onClick={startCall} style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--green)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 0 12px rgba(39,174,96,0.12), 0 0 0 24px rgba(39,174,96,0.06)", WebkitTapHighlightColor: "transparent" }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </button>

      <a href="/mode" style={{ marginTop: 40, fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>← Modus wechseln</a>
    </div>
  );

  // ── ENDED ─────────────────────────────────────────────
  if (phase === "ended") return (
    <div style={{ minHeight: "100dvh", background: "#f8f6ff", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top,0px) + 24px) 16px calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 300, color: "var(--text)", marginBottom: 4 }}>Gespräch beendet</p>
        <p style={{ fontSize: 12, color: "#8a7060" }}>{fmt(duration)} · {messages.length} Nachrichten</p>
      </div>

      <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ padding: "10px 14px", borderRadius: 16, maxWidth: "85%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", background: msg.role === "user" ? "linear-gradient(135deg, #7c4daa, #e8643a)" : "#f0ebff", border: `0.5px solid ${msg.role === "user" ? "transparent" : "#ddd5f0"}`, borderLeft: msg.role === "assistant" ? "2px solid #7c4daa" : undefined }}>
            <div style={{ fontSize: 10, color: msg.role === "assistant" ? "#7c4daa" : "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{msg.role === "user" ? (user?.name ?? "Du") : "Maya"}</div>
            <p style={{ fontSize: 14, color: msg.role === "user" ? "#ffffff" : "#2d1f1a", lineHeight: 1.6, margin: 0 }}>{msg.content}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { setPhase("idle"); setMessages([]); setDuration(0); }} style={{ flex: 1, padding: "14px", borderRadius: 10, border: "0.5px solid #e0d8f0", background: "#ffffff", color: "#2d1f1a", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)", minHeight: 48 }}>
          Nochmal
        </button>
        <a href="/mode" style={{ flex: 1, padding: "14px", borderRadius: 10, border: "0.5px solid var(--accent-dim)", background: "var(--accent-glow)", color: "var(--accent)", fontSize: 14, fontFamily: "var(--font-mono)", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48 }}>
          Fertig
        </a>
      </div>
    </div>
  );

  // ── ACTIVE ────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", paddingTop: "calc(env(safe-area-inset-top,0px) + 16px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 12px", borderBottom: "0.5px solid #e8e0f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: callState === "speaking" ? "var(--green)" : callState === "listening" ? "var(--accent)" : "var(--border)", boxShadow: callState === "speaking" ? "0 0 6px rgba(39,174,96,0.6)" : callState === "listening" ? "0 0 6px rgba(212,168,67,0.6)" : "none", transition: "all 0.3s" }} />
          <span style={{ fontSize: 11, color: "#8a7060", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
            {callState === "listening" ? "HOERT ZU" : callState === "thinking" ? "DENKT NACH" : "SPRICHT"}
          </span>
        </div>
        <span style={{ fontSize: 13, color: "#8a7060", fontFamily: "var(--font-mono)" }}>{fmt(duration)}</span>
      </div>

      {/* Conversation bubbles */}
      <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gradient-soft)", border: "2px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, color: "var(--accent)" }}>M</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Maya verbindet...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ maxWidth: "85%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", animation: "fade-in 0.2s ease-out" }}>
            <div style={{ padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "linear-gradient(135deg, #7c4daa, #e8643a)" : "#f0ebff", border: `0.5px solid ${msg.role === "user" ? "transparent" : "#ddd5f0"}` }}>
              <div style={{ fontSize: 10, color: msg.role === "assistant" ? "var(--accent)" : "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                {msg.role === "user" ? (user?.name ?? "Du") : "Maya"}
              </div>
              <p style={{ fontSize: 14, color: msg.role === "user" ? "#ffffff" : "#2d1f1a", lineHeight: 1.6, margin: 0 }}>{msg.content.replace(/<end>/g, "").trim()}</p>
              {msg.translation && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>💡 {msg.translation}</p>
              )}
            </div>
          </div>
        ))}

        {/* Live text while speaking */}
        {liveText && callState === "listening" && (
          <div style={{ maxWidth: "85%", alignSelf: "flex-end" }}>
            <div style={{ padding: "10px 14px", borderRadius: "16px 16px 4px 16px", background: "linear-gradient(135deg, rgba(124,77,170,0.08), rgba(232,100,58,0.08))", border: "0.5px solid rgba(124,77,170,0.2)" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{user?.name ?? "Du"}</div>
              <p style={{ fontSize: 14, color: "#8a7060", lineHeight: 1.6, margin: 0 }}>
                {liveText.replace(/<end>/g, "").trim()}
                <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--accent)", marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" }} />
              </p>
            </div>
          </div>
        )}
        {/* Thinking dots */}
        {callState === "thinking" && (
          <div style={{ maxWidth: "85%", alignSelf: "flex-start" }}>
            <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "#f0ebff", border: "0.5px solid #ddd5f0", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(212,168,67,0.5)", animation: `wave 1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom — volume indicator + hang up */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "16px" }}>

        {/* Volume bars */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const height = callState === "listening"
              ? Math.max(4, Math.min(28, (volume / 50) * 28 * Math.abs(Math.sin((i + 1) * 0.7))))
              : callState === "speaking"
              ? 8 + Math.abs(Math.sin(i * 0.8)) * 12
              : 4;
            return (
              <div key={i} style={{
                width: 3, borderRadius: 2, transition: "height 0.1s",
                height: `${height}px`,
                background: callState === "speaking"
                  ? `rgba(39,174,96,${0.4 + i * 0.06})`
                  : callState === "listening" && volume > SILENCE_THRESHOLD
                  ? `rgba(212,168,67,${0.4 + i * 0.06})`
                  : "rgba(255,255,255,0.15)",
              }} />
            );
          })}
        </div>

        {/* Silence hint */}
        {showSilenceHint && callState === "listening" && (
          <div style={{
            background: "rgba(212,168,67,0.08)",
            border: "0.5px solid rgba(212,168,67,0.2)",
            borderRadius: 10, padding: "10px 16px",
            textAlign: "center", animation: "fade-in 0.3s ease-out",
          }}>
            <p style={{ fontSize: 12, color: "#7c4daa", marginBottom: 4 }}>
              🎙️ Sprich laut — Maya hört zu
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              Sag einen ganzen Satz auf Deutsch
            </p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{error}</p>
            <a href="/mode" style={{ fontSize: 12, color: "var(--accent)", border: "0.5px solid var(--accent-dim)", padding: "6px 16px", borderRadius: 6, textDecoration: "none" }}>
              Modus wechseln
            </a>
          </div>
        )}

        {/* Hang up */}
        <button
          onClick={endCall}
          style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(192,57,43,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", boxShadow: "0 4px 20px rgba(192,57,43,0.3)" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
}
