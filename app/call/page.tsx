"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSpeechRecorder } from "@/components/SpeechRecorder";
import { Message } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./call.module.css";

type CallState = "idle" | "listening" | "thinking" | "speaking";
let _isSending = false;

function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const acquire = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {}
  };
  const release = () => { wakeLockRef.current?.release(); wakeLockRef.current = null; };
  return { acquire, release };
}

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [ttsProvider, setTtsProvider] = useState<"soniox" | "fish">("soniox");
  const [showReport, setShowReport] = useState(false);
  const [newWords, setNewWords] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [user, setUser] = useState<{ name: string; streak: number } | null>(null);
  const [daysSince, setDaysSince] = useState(0);
  const [saved, setSaved] = useState(false);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState<number | null>(null);

  const finalBufferRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef(0);
  const streamTTSRef = useRef<((text: string) => void) | null>(null);
  const router = useRouter();
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  useEffect(() => {
    fetch("/api/context")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        setSystemPrompt(data.systemPrompt);
        setUser({ name: data.user.name, streak: data.streak ?? 0 });
        setDaysSince(data.daysSinceLastCall ?? 0);
        if (data.opening) {
          const msg: Message = { role: "assistant", content: data.opening, timestamp: Date.now() };
          setMessages([msg]);
          setTimeout(() => streamTTSRef.current?.(data.opening), 300);
        }
      })
      .catch(console.error);
  }, []);

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
        if (sourceQueueRef.current.length === 0) setCallState("idle");
      };
      sourceQueueRef.current.push(source);
    } catch {}
  }, []);

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
      if (!res.ok || !res.body) throw new Error("TTS failed");
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

  const autoSave = useCallback((msgs: Message[]) => {
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId, userId: "",
        startedAt: sessionStart, endedAt: Date.now(),
        messages: msgs,
        title: msgs.find(m => m.role === "user")?.content?.slice(0, 60) ?? "Gespraech",
        totalMessages: msgs.length,
      }),
    });
  }, [sessionId, sessionStart]);

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
      const lines = fullText.split("\n").filter(Boolean);
      const hint = lines.find(l => l.startsWith("\u{1F4A1}"));
      const german = lines.filter(l => !l.startsWith("\u{1F4A1}")).join(" ").trim();
      const assistantMsg: Message = { role: "assistant", content: german, translation: hint?.replace("\u{1F4A1} ", ""), timestamp: Date.now() };
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        autoSave(updated);
        return updated;
      });
      _isSending = false;
      await streamTTS(german);
    } catch {
      _isSending = false;
      setError("Something went wrong. Try again.");
      setCallState("idle");
    }
  }, [streamTTS, systemPrompt, autoSave]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) { finalBufferRef.current += text; setLiveText(finalBufferRef.current); }
    else setLiveText(finalBufferRef.current + text);
  }, []);

  const handleRecordingEnd = useCallback(() => {
    if (_isSending) return;
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
    onVolume: setVolumeLevel,
    onSpeechStart: () => setCallState("listening"),
  });

  const translateMessage = async (text: string, index: number) => {
    if (translations[index]) {
      setTranslations(prev => { const n = {...prev}; delete n[index]; return n; });
      return;
    }
    setLoadingTranslation(index);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Translate this German text to English in one sentence: "${text}"` }],
          systemPrompt: "You are a translator. Translate the German text to natural English. Return only the translation, nothing else.",
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
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
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

  const handleCallButton = async () => {
    if (navigator.vibrate) navigator.vibrate(40);
    if (callState === "idle") {
      setError(null);
      finalBufferRef.current = "";
      setLiveText("");
      setCallState("listening");
      getAudioCtx();
      await acquireWakeLock();
      start();
    } else if (callState === "listening") {
      stop();
    } else if (callState === "speaking") {
      stopAudio();
      setCallState("idle");
    }
  };

  const generateReport = () => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    const userText = messages.filter(m => m.role === "user").map(m => m.content.toLowerCase()).join(" ");
    const felixText = messages.filter(m => m.role === "assistant").map(m => m.content).join(" ");
    const felixWords = Array.from(new Set(felixText.match(/[a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]{4,}/g) || []));
    const userWords = new Set((userText.match(/[a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]{3,}/g) || []).map(w => w.toLowerCase()));
    const common = ["dass","eine","einen","einem","einer","nicht","auch","noch","oder","aber","dein","mein","sein","haben","waren","wird","sind","hast","habe","kann","wenn","dann","mehr","sehr","sich","wäre","hallo","schön","gerne","immer","etwas","heute","jetzt"];
    const words = felixWords.filter(w => !userWords.has(w.toLowerCase())).filter(w => !common.includes(w.toLowerCase())).slice(0, 20);
    setNewWords(words);
    setShowReport(true);
    stop(); stopAudio(); setCallState("idle");
    releaseWakeLock();
    fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
    setSaved(true);
  };

  const stateLabel: Record<CallState, string> = {
    idle: "Tippen zum Sprechen",
    listening: "Maya hoert zu...",
    thinking: "Maya denkt nach...",
    speaking: "Maya spricht — tippen zum Unterbrechen",
  };

  const bars = Array.from({ length: 7 });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDE}>DE</span>
          <span className={styles.logoText}>CallMeDaily</span>
        </div>
        <nav className={styles.nav}>
          <div className={styles.providerToggle}>
            <button className={`${styles.providerBtn} ${ttsProvider === "soniox" ? styles.providerBtnActive : ""}`} onClick={() => setTtsProvider("soniox")}>Soniox</button>
            <button className={`${styles.providerBtn} ${ttsProvider === "fish" ? styles.providerBtnActive : ""}`} onClick={() => setTtsProvider("fish")}>Fish</button>
          </div>
          <Link href="/history" className={styles.navLink}>Verlauf</Link>
          {messages.length > 1 && (
            <button className={styles.endBtn} onClick={generateReport}>Ende</button>
          )}
        </nav>
      </header>

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
            <p className={styles.bubbleText}>{msg.content}</p>
            {msg.translation && <p className={styles.bubbleHint}>{msg.translation}</p>}
            {msg.role === "assistant" && (
              <div>
                <button
                  onClick={() => translateMessage(msg.content, i)}
                  style={{
                    fontSize: 10, color: translations[i] ? "var(--accent)" : "var(--text-dim)",
                    border: "0.5px solid var(--border)", borderRadius: 4,
                    padding: "2px 8px", marginTop: 6, cursor: "pointer",
                    background: translations[i] ? "var(--accent-glow)" : "none",
                    fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
                  }}
                >
                  {loadingTranslation === i ? "..." : translations[i] ? "DE" : "EN"}
                </button>
                {translations[i] && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>
                    {translations[i]}
                  </p>
                )}
              </div>
            )}
            <span className={styles.bubbleTime}>{new Date(msg.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        ))}
        {liveText && (
          <div className={`${styles.bubble} ${styles.userBubble} ${styles.livePreview}`}>
            <div className={styles.bubbleRole}>{user?.name ?? "Du"}</div>
            <p className={styles.bubbleText}>{liveText}<span className={styles.cursor} /></p>
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

      <div className={styles.bottom}>
        {error && <p className={styles.error}>{error}</p>}
        <p className={styles.status}>{stateLabel[callState]}</p>
        <button
          className={`${styles.callBtn} ${callState === "listening" ? styles.callBtnListening : ""} ${callState === "speaking" ? styles.callBtnSpeaking : ""} ${callState === "thinking" ? styles.callBtnThinking : ""}`}
          onClick={handleCallButton}
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

      {showReport && (
        <div className={styles.reportOverlay}>
          <div className={styles.reportInner}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 300, color: "var(--text)" }}>Bericht</h2>
              <button onClick={() => setShowReport(false)} style={{ color: "var(--text-muted)", fontSize: 22, padding: "4px 8px", minWidth: 44, minHeight: 44 }}>x</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Nachrichten", value: messages.length },
                { label: "Deine Woerter", value: messages.filter(m => m.role === "user").flatMap(m => m.content.split(" ")).length },
                { label: "Neue Woerter", value: newWords.length },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
                </div>
              ))}
            </div>
            {newWords.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Neue Woerter</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {newWords.map(w => (
                    <span key={w} style={{ background: "var(--accent-glow)", border: "0.5px solid var(--accent-dim)", color: "var(--accent)", borderRadius: 20, padding: "5px 12px", fontSize: 14, fontFamily: "var(--font-serif)" }}>{w}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Gespraech</div>
              {messages.map((msg, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 6, background: msg.role === "user" ? "var(--surface)" : "linear-gradient(135deg,#1a1a1d,#161618)", border: "0.5px solid var(--border)", borderLeft: msg.role === "assistant" ? "2px solid var(--accent-dim)" : undefined, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: msg.role === "assistant" ? "var(--accent)" : "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{msg.role === "user" ? (user?.name ?? "Du") : "Maya"}</div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{msg.content}</p>
                  {msg.translation && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>{msg.translation}</p>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowReport(false); setMessages([]); setSaved(false); }} style={{ flex: 1, padding: "14px", borderRadius: 10, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-mono)", minHeight: 48 }}>
                Neues Gespraech
              </button>
              <Link href="/history" style={{ flex: 1, padding: "14px", borderRadius: 10, border: "0.5px solid var(--accent-dim)", background: "var(--accent-glow)", color: "var(--accent)", fontSize: 14, fontFamily: "var(--font-mono)", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48 }}>
                Verlauf
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
