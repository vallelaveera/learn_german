"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSpeechRecorder } from "@/components/SpeechRecorder";
import { Message, Session } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./call.module.css";

type CallState = "idle" | "listening" | "thinking" | "speaking";

let _isSending = false;

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [ttsProvider, setTtsProvider] = useState<"soniox" | "fish">("soniox");
  const [showReport, setShowReport] = useState(false);
  const [newWords, setNewWords] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [user, setUser] = useState<{ name: string; streak: number; email: string } | null>(null);
  const [daysSince, setDaysSince] = useState<number>(0);
  const [contextLoaded, setContextLoaded] = useState(false);

  const finalBufferRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  // Load memory context on mount
  useEffect(() => {
    fetch("/api/context")
      .then(r => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setSystemPrompt(data.systemPrompt);
        setUser({ name: data.user.name, streak: data.streak, email: data.user.email });
        setDaysSince(data.daysSinceLastCall);

        // Maya opens with personalized message
        if (data.opening) {
          const openingMsg: Message = {
            role: "assistant",
            content: data.opening,
            timestamp: Date.now(),
          };
          setMessages([openingMsg]);
          streamTTSRef.current?.(data.opening);
        }
        setContextLoaded(true);
      })
      .catch(() => setContextLoaded(true));
  }, []);

  const streamTTSRef = useRef<((text: string) => void) | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
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
      const CHUNK_SIZE = 16384;
      let buffer = new Uint8Array(0);
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.length > 0) playChunk(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
          break;
        }
        const newBuf = new Uint8Array(buffer.length + value.length);
        newBuf.set(buffer); newBuf.set(value, buffer.length);
        buffer = newBuf;
        if (buffer.length >= CHUNK_SIZE) {
          const toPlay = buffer.slice(0, CHUNK_SIZE);
          buffer = buffer.slice(CHUNK_SIZE);
          playChunk(toPlay.buffer.slice(toPlay.byteOffset, toPlay.byteOffset + toPlay.byteLength));
        }
      }
    } catch { setCallState("idle"); }
  }, [playChunk, stopAudio, ttsProvider]);

  // Store streamTTS in ref so useEffect can use it
  useEffect(() => { streamTTSRef.current = streamTTS; }, [streamTTS]);

  const sendToTutor = useCallback(async (msgs: Message[]) => {
    setCallState("thinking");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, systemPrompt }),
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              fullText += parsed.delta.text;
            }
          } catch {}
        }
      }

      if (!fullText) throw new Error("Empty response");

      const lines = fullText.split("\n").filter(Boolean);
      const hintLine = lines.find(l => l.startsWith("💡"));
      const germanText = lines.filter(l => !l.startsWith("💡")).join(" ").trim();

      const assistantMsg: Message = {
        role: "assistant",
        content: germanText,
        translation: hintLine?.replace("💡 ", ""),
        timestamp: Date.now(),
      };

      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        // Auto-save session after every exchange
        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sessionId,
            userId: "",
            startedAt: sessionStart,
            endedAt: Date.now(),
            messages: updated,
            title: updated.find(m => m.role === "user")?.content?.slice(0, 60) ?? "Gespräch",
            totalMessages: updated.length,
          }),
        });
        return updated;
      });
      _isSending = false;
      await streamTTS(germanText);
    } catch {
      _isSending = false;
      setError("Something went wrong. Please try again.");
      setCallState("idle");
    }
  }, [streamTTS, systemPrompt]);

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
    setMessages(prev => {
      const updated = [...prev, userMsg];
      sendToTutor(updated);
      return updated;
    });
  }, [sendToTutor]);

  const { start, stop } = useSpeechRecorder({
    apiKey: process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "",
    onTranscript: handleTranscript,
    onEnd: handleRecordingEnd,
    onError: e => { setError(e); setCallState("idle"); },
    onVolume: setVolumeLevel,
    onSpeechStart: () => setCallState("listening"),
  });

  const generateReport = () => {
    const userText = messages.filter(m => m.role === "user").map(m => m.content.toLowerCase()).join(" ");
    const felixText = messages.filter(m => m.role === "assistant").map(m => m.content).join(" ");
    const felixWords = Array.from(new Set(felixText.match(/[a-zA-ZäöüÄÖÜß]{4,}/g) || []));
    const userWords = new Set((userText.match(/[a-zA-ZäöüÄÖÜß]{3,}/g) || []).map(w => w.toLowerCase()));
    const common = ["dass","eine","einen","einem","einer","nicht","auch","noch","oder","aber","dein","mein","sein","haben","waren","wird","sind","hast","habe","kann","wenn","dann","über","nach","mehr","sehr","sich","beim","wäre","hallo","schön","gerne","immer","etwas","heute","jetzt","schon","noch","doch","aber","auch","hier","dort","dann","wann","weil","denn","dich","mich","sich","uns","euch","ihnen","Ihnen"];
    const words = felixWords
      .filter(w => !userWords.has(w.toLowerCase()))
      .filter(w => !common.includes(w.toLowerCase()))
      .filter(w => /[äöüÄÖÜß]|[a-z]{5,}/.test(w))
      .slice(0, 20);

    setNewWords(words);
    setShowReport(true);
    stop();
    stopAudio();
    setCallState("idle");

    const session: Session = {
      id: sessionId,
      userId: "",
      startedAt: sessionStart,
      endedAt: Date.now(),
      messages,
      title: messages.find(m => m.role === "user")?.content?.slice(0, 60) ?? "Gespräch",
      newWords: words,
      totalUserWords: messages.filter(m => m.role === "user").map(m => m.content.split(" ").length).reduce((a, b) => a + b, 0),
      totalMessages: messages.length,
    };

    // Extract facts + save session in background
    Promise.all([
      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }),
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      }),
    ]);
    setSaved(true);
  };

  const handleCallButton = () => {
    if (callState === "idle") {
      setError(null);
      finalBufferRef.current = "";
      setLiveText("");
      setCallState("listening");
      getAudioCtx();
      start();
    } else if (callState === "speaking") {
      stopAudio();
      setCallState("idle");
    } else if (callState === "listening") {
      stop();
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const stateLabel: Record<CallState, string> = {
    idle: contextLoaded ? "Drücken zum Sprechen" : "Maya bereitet sich vor...",
    listening: "Zuhören...",
    thinking: "Maya denkt nach...",
    speaking: "Maya spricht... (drücken zum Unterbrechen)",
  };

  const bars = Array.from({ length: 7 });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDE}>DE</span>
          <span className={styles.logoText}>Call to Learn</span>
        </div>
        <nav className={styles.nav}>
          {user && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {user.name} · {user.streak > 0 ? `🔥 ${user.streak}` : ""}
            </span>
          )}
          <div className={styles.providerToggle}>
            <button className={`${styles.providerBtn} ${ttsProvider === "soniox" ? styles.providerBtnActive : ""}`} onClick={() => setTtsProvider("soniox")}>Soniox</button>
            <button className={`${styles.providerBtn} ${ttsProvider === "fish" ? styles.providerBtnActive : ""}`} onClick={() => setTtsProvider("fish")}>Fish 🐟</button>
          </div>
          <Link href="/history" className={styles.navLink}>Verlauf</Link>
          {messages.length > 1 && (
            <button className={styles.saveBtn} onClick={generateReport} style={{ borderColor: "rgba(192,57,43,0.4)", color: "var(--red)" }}>
              Beenden
            </button>
          )}
          <button onClick={handleLogout} style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer", background: "none", border: "none" }}>
            Abmelden
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.avatarArea}>
          <div className={`${styles.avatar} ${callState === "speaking" ? styles.avatarSpeaking : ""}`}>
            <span className={styles.avatarInitial}>F</span>
            {callState === "speaking" && (
              <div className={styles.speakingRings}>
                <div className={styles.ring} style={{ animationDelay: "0s" }} />
                <div className={styles.ring} style={{ animationDelay: "0.3s" }} />
                <div className={styles.ring} style={{ animationDelay: "0.6s" }} />
              </div>
            )}
          </div>
          <p className={styles.felixLabel}>Maya — {user ? `${user.name}'s Deutschfreund` : "dein Deutschfreund"}</p>
          {daysSince > 0 && daysSince < 999 && (
            <p className={styles.levelBadge} style={{ color: daysSince >= 3 ? "var(--red)" : "var(--accent)" }}>
              {daysSince === 0 ? "heute aktiv" : `${daysSince}d seit letztem Gespräch`}
            </p>
          )}
        </div>

        <div className={styles.transcript}>
          {messages.length === 0 && !contextLoaded && (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Maya lädt...</p>
              <p className={styles.emptyHint}>Er erinnert sich an euch beide.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}>
              <div className={styles.bubbleRole}>{msg.role === "user" ? (user?.name ?? "Du") : "Maya"}</div>
              <p className={styles.bubbleText}>{msg.content}</p>
              {msg.translation && <p className={styles.bubbleHint}>💡 {msg.translation}</p>}
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </main>

      {/* Report overlay */}
      {showReport && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(14,14,15,0.97)",
          zIndex: 100, overflowY: "auto", display: "flex",
          flexDirection: "column", alignItems: "center", padding: "40px 24px",
        }}>
          <div style={{ width: "100%", maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 300, color: "var(--text)" }}>
                Gesprächsbericht
              </h2>
              <button onClick={() => setShowReport(false)} style={{ color: "var(--text-muted)", fontSize: 20, cursor: "pointer", background: "none", border: "none", padding: "4px 8px" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Nachrichten", value: messages.length },
                { label: "Deine Wörter", value: messages.filter(m => m.role === "user").map(m => m.content.split(" ").length).reduce((a, b) => a + b, 0) },
                { label: "Neue Wörter", value: newWords.length },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 500, color: "var(--accent)" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {newWords.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
                  Neue Wörter von Maya — lern sie!
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {newWords.map(word => (
                    <span key={word} style={{
                      background: "var(--accent-glow)", border: "1px solid var(--accent-dim)",
                      color: "var(--accent)", borderRadius: 20, padding: "6px 14px",
                      fontSize: 14, fontFamily: "var(--font-serif)",
                    }}>{word}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
                Gesprächsverlauf
              </h3>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  padding: "10px 14px", marginBottom: 8,
                  background: msg.role === "user" ? "var(--surface)" : "linear-gradient(135deg,#1a1a1d,#161618)",
                  border: "1px solid var(--border)",
                  borderLeft: msg.role === "assistant" ? "2px solid var(--accent-dim)" : undefined,
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 10, color: msg.role === "assistant" ? "var(--accent)" : "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
                    {msg.role === "user" ? (user?.name ?? "Du") : "Maya"}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{msg.content}</p>
                  {msg.translation && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>💡 {msg.translation}</p>}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setShowReport(false); setMessages([]); setSaved(false); router.refresh(); }} style={{
                flex: 1, padding: "12px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: "var(--text)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-mono)",
              }}>Neues Gespräch</button>
              <Link href="/history" style={{
                flex: 1, padding: "12px", borderRadius: 8,
                border: "1px solid var(--accent-dim)", background: "var(--accent-glow)",
                color: "var(--accent)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-mono)",
                textAlign: "center", textDecoration: "none",
              }}>Verlauf ansehen</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
