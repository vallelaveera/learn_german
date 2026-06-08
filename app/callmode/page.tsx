"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Message } from "@/lib/types";

// ── Module-level flags — never stale inside callbacks ──
let _isSending = false;
let _isActive = false;

const SILENCE_THRESHOLD = 8;    // volume below this = silence
const SILENCE_DURATION = 1500;  // ms of silence before sending
const SONIOX_SAMPLE_RATE = 16000;

export default function CallModePage() {
  const [phase, setPhase] = useState<"idle" | "connecting" | "active" | "ended">("idle");
  const [callState, setCallState] = useState<"listening" | "thinking" | "speaking">("listening");
  const [messages, setMessages] = useState<Message[]>([]);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef(0);

  // Mic refs
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // VAD refs — volume based
  const speechBufferRef = useRef<string>("");  // accumulates all speech until sent
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);

  // Session refs
  const messagesRef = useRef<Message[]>([]);
  const systemPromptRef = useRef<string | undefined>();
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const router = useRouter();

  // Keep messagesRef in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);

  // Load user + context
  useEffect(() => {
    fetch("/api/context")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        setUser({ name: data.user.name });
        setSystemPrompt(data.systemPrompt);
      })
      .catch(console.error);
  }, []);

  // ── Audio playback ────────────────────────────────────────
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
        if (sourceQueueRef.current.length === 0 && _isActive) {
          // Maya finished — go back to listening
          setCallState("listening");
          _isSending = false;
          restartMic();
        }
      };
      sourceQueueRef.current.push(source);
    } catch {}
  }, []);

  // ── TTS ───────────────────────────────────────────────────
  const streamTTS = useCallback(async (text: string) => {
    setCallState("speaking");
    stopMic(); // stop mic while Maya speaks
    stopAudio();
    nextStartTimeRef.current = 0;
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider: "soniox" }),
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
    } catch {
      setCallState("listening");
      _isSending = false;
      restartMic();
    }
  }, [playChunk, stopAudio]);

  // ── Send to Claude ────────────────────────────────────────
  const sendToTutor = useCallback(async (text: string) => {
    if (!text.trim() || _isSending) return;
    _isSending = true;
    setCallState("thinking");

    const userMsg: Message = { role: "user", content: text.trim(), timestamp: Date.now() };
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
      const assistantMsg: Message = { role: "assistant", content: german, translation: hint?.replace("💡 ", ""), timestamp: Date.now() };
      const withAssistant = [...messagesRef.current, assistantMsg];
      setMessages(withAssistant);
      messagesRef.current = withAssistant;
      await streamTTS(german);
    } catch {
      _isSending = false;
      setCallState("listening");
      restartMic();
    }
  }, [streamTTS, sessionId, sessionStart]);

  // ── Volume-based VAD ──────────────────────────────────────
  const handleVolumeAndVAD = useCallback((vol: number) => {
    setVolume(vol);
    if (!_isActive || _isSending) return;

    if (vol > SILENCE_THRESHOLD) {
      // User is speaking
      isSpeakingRef.current = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      // Silence detected
      if (isSpeakingRef.current && speechBufferRef.current.trim()) {
        // Start silence timer — send after SILENCE_DURATION
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            if (speechBufferRef.current.trim() && !_isSending) {
              const textToSend = speechBufferRef.current.trim();
              speechBufferRef.current = "";
              isSpeakingRef.current = false;
              sendToTutor(textToSend);
            }
          }, SILENCE_DURATION);
        }
      }
    }
  }, [sendToTutor]);

  // ── Mic start ─────────────────────────────────────────────
  const startMic = useCallback(async () => {
    if (wsRef.current) return; // already running
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);

      // Analyser for volume
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const measureVolume = () => {
        if (!_isActive) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        handleVolumeAndVAD(avg);
        animFrameRef.current = requestAnimationFrame(measureVolume);
      };
      measureVolume();

      // Soniox WebSocket for transcription
      const ws = new WebSocket(
        `wss://soniox.com/transcribe-websocket?api_key=${process.env.NEXT_PUBLIC_SONIOX_API_KEY}&model=soniox_telephony&language_hints=de,en`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        // ScriptProcessor to send audio
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        processor.connect(ctx.destination);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          // Resample to 16kHz
          const ratio = ctx.sampleRate / SONIOX_SAMPLE_RATE;
          const outLen = Math.floor(input.length / ratio);
          const out = new Int16Array(outLen);
          for (let i = 0; i < outLen; i++) {
            const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]));
            out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          ws.send(out.buffer);
        };
      };

      ws.onmessage = (e) => {
        const res = JSON.parse(e.data);
        let finalText = "";
        for (const token of res.tokens ?? []) {
          if (token.is_final && token.text) finalText += token.text;
        }
        if (finalText && _isActive && !_isSending) {
          // Append to buffer — user may still be speaking
          speechBufferRef.current += finalText;
        }
      };

      ws.onerror = () => setError("Mikrofon Fehler — bitte neu starten");
    } catch {
      setError("Mikrofon Zugriff verweigert");
    }
  }, [handleVolumeAndVAD]);

  // ── Mic stop ──────────────────────────────────────────────
  const stopMic = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const restartMic = useCallback(() => {
    stopMic();
    setTimeout(() => {
      if (_isActive) startMic();
    }, 300);
  }, [stopMic, startMic]);

  // ── Start call ────────────────────────────────────────────
  const startCall = async () => {
    if (navigator.vibrate) navigator.vibrate(40);
    setPhase("connecting");
    setError(null);
    speechBufferRef.current = "";
    isSpeakingRef.current = false;
    _isSending = false;
    _isActive = true;

    // Wake lock
    try {
      if ("wakeLock" in navigator) await (navigator as any).wakeLock.request("screen");
    } catch {}

    await startMic();

    // Duration timer
    durationTimerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    // Load opening from context
    fetch("/api/context")
      .then(r => r.json())
      .then(data => {
        if (data?.opening) {
          const msg: Message = { role: "assistant", content: data.opening, timestamp: Date.now() };
          setMessages([msg]);
          messagesRef.current = [msg];
          streamTTS(data.opening);
        }
      });

    setPhase("active");
    setCallState("listening");
  };

  // ── End call ──────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    _isActive = false;
    _isSending = false;
    stopMic();
    stopAudio();
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);

    // Extract facts
    if (messagesRef.current.length > 1) {
      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesRef.current }),
      });
    }
    setPhase("ended");
  }, [stopMic, stopAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _isActive = false;
      stopMic();
      stopAudio();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [stopMic, stopAudio]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const bars = Array.from({ length: 5 });

  // ── IDLE screen ───────────────────────────────────────────
  if (phase === "idle" || phase === "connecting") {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", paddingTop: "calc(env(safe-area-inset-top,0px) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 11, fontWeight: 600, background: "var(--accent)", color: "var(--bg)", padding: "2px 6px", borderRadius: 3 }}>DE</span>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300 }}>CallMeDaily</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Call Mode — Freihändig</p>
        </div>

        {/* Maya avatar with pulse */}
        <div style={{ position: "relative", marginBottom: 40 }}>
          {phase === "connecting" && (
            <>
              <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "1px solid var(--accent-dim)", animation: "pulse-ring 1.5s ease-out infinite" }} />
              <div style={{ position: "absolute", inset: -35, borderRadius: "50%", border: "1px solid var(--accent-dim)", animation: "pulse-ring 1.5s ease-out 0.4s infinite" }} />
            </>
          )}
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--surface)", border: `2px solid ${phase === "connecting" ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.3s" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 40, color: "var(--accent)" }}>M</span>
          </div>
        </div>

        <p style={{ fontSize: 15, color: "var(--text)", marginBottom: 8, fontFamily: "var(--font-serif)", fontWeight: 300 }}>
          {phase === "connecting" ? "Verbinde mit Maya..." : `Maya ruft an${user ? `, ${user.name}` : ""}...`}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 48, textAlign: "center", lineHeight: 1.6 }}>
          Sprich einfach — Maya hört automatisch zu
        </p>

        {phase === "idle" && (
          <button
            onClick={startCall}
            style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--green)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 0 8px rgba(39,174,96,0.15)", WebkitTapHighlightColor: "transparent" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        )}

        <a href="/mode" style={{ marginTop: 32, fontSize: 12, color: "var(--text-dim)" }}>← Modus wechseln</a>
      </div>
    );
  }

  // ── ENDED screen ──────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", paddingTop: "calc(env(safe-area-inset-top,0px) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--accent)" }}>M</span>
            </div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 300, color: "var(--text)", marginBottom: 4 }}>Gespräch beendet</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDuration(duration)} · {messages.length} Nachrichten</p>
          </div>

          {/* Transcript */}
          <div style={{ maxHeight: "50vh", overflowY: "auto", marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ padding: "8px 12px", background: msg.role === "user" ? "var(--surface)" : "linear-gradient(135deg,#1a1a1d,#161618)", border: "0.5px solid var(--border)", borderLeft: msg.role === "assistant" ? "2px solid var(--accent-dim)" : undefined, borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: msg.role === "assistant" ? "var(--accent)" : "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{msg.role === "user" ? (user?.name ?? "Du") : "Maya"}</div>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{msg.content}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setPhase("idle"); setMessages([]); setDuration(0); speechBufferRef.current = ""; }} style={{ flex: 1, padding: "14px", borderRadius: 10, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)", minHeight: 48 }}>
              Nochmal
            </button>
            <a href="/mode" style={{ flex: 1, padding: "14px", borderRadius: 10, border: "0.5px solid var(--accent-dim)", background: "var(--accent-glow)", color: "var(--accent)", fontSize: 14, fontFamily: "var(--font-mono)", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48 }}>
              Fertig
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE call screen ────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "calc(env(safe-area-inset-top,0px) + 40px) 24px calc(env(safe-area-inset-bottom,0px) + 40px)" }}>

      {/* Top — name + duration */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", marginBottom: 8 }}>
          {callState === "listening" ? "HOERT ZU" : callState === "thinking" ? "DENKT NACH" : "SPRICHT"}
        </p>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 300, color: "white", marginBottom: 4 }}>Maya</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{formatDuration(duration)}</p>
      </div>

      {/* Middle — avatar with live animation */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Volume rings */}
        {callState === "listening" && volume > SILENCE_THRESHOLD && (
          <>
            <div style={{ position: "absolute", width: 160 + volume, height: 160 + volume, borderRadius: "50%", border: "1px solid rgba(212,168,67,0.15)", transition: "all 0.1s" }} />
            <div style={{ position: "absolute", width: 130 + volume * 0.6, height: 130 + volume * 0.6, borderRadius: "50%", border: "1px solid rgba(212,168,67,0.25)", transition: "all 0.1s" }} />
          </>
        )}
        {callState === "speaking" && (
          <>
            <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(39,174,96,0.2)", animation: "pulse-ring 1.5s ease-out infinite" }} />
            <div style={{ position: "absolute", width: 155, height: 155, borderRadius: "50%", border: "1px solid rgba(39,174,96,0.15)", animation: "pulse-ring 1.5s ease-out 0.4s infinite" }} />
          </>
        )}

        {/* Avatar */}
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: `2px solid ${callState === "speaking" ? "rgba(39,174,96,0.6)" : callState === "listening" && volume > SILENCE_THRESHOLD ? "rgba(212,168,67,0.6)" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 48, color: callState === "speaking" ? "rgba(39,174,96,0.9)" : "rgba(212,168,67,0.9)" }}>M</span>
        </div>
      </div>

      {/* Bottom — waveform + hang up */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {/* Waveform when listening */}
        <div style={{ height: 32, display: "flex", alignItems: "center", gap: 4 }}>
          {callState === "listening" ? bars.map((_, i) => (
            <div key={i} style={{ width: 4, borderRadius: 2, background: volume > SILENCE_THRESHOLD ? "var(--accent)" : "rgba(255,255,255,0.2)", height: volume > SILENCE_THRESHOLD ? `${Math.min(32, 8 + (volume / 50) * 24 + Math.sin(Date.now() / 200 + i) * 8)}px` : "6px", transition: "height 0.1s, background 0.2s" }} />
          )) : callState === "thinking" ? (
            <div style={{ display: "flex", gap: 6 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: `wave 1s ease-in-out ${i * 0.15}s infinite` }} />)}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              {bars.map((_, i) => <div key={i} style={{ width: 4, borderRadius: 2, background: "rgba(39,174,96,0.6)", animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite`, height: "20px" }} />)}
            </div>
          )}
        </div>

        {/* Hang up button */}
        <button
          onClick={endCall}
          style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(192,57,43,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", boxShadow: "0 4px 20px rgba(192,57,43,0.4)" }}
          aria-label="Anruf beenden"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>

        {error && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{error}</p>
            <button onClick={() => { endCall(); router.push("/mode"); }} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "0.5px solid var(--accent-dim)", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
              Modus wechseln
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
