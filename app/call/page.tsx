"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSpeechRecorder } from "@/components/SpeechRecorder";
import { Message, Session } from "@/lib/types";
import Link from "next/link";
import styles from "./call.module.css";

type CallState = "idle" | "listening" | "thinking" | "speaking";

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [newWords, setNewWords] = useState<string[]>([]);
  const [ttsProvider, setTtsProvider] = useState<"soniox" | "fish">("soniox");

  const finalBufferRef = useRef<string>("");
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  };

  const stopAudio = useCallback(() => {
    sourceQueueRef.current.forEach((s) => { try { s.stop(); } catch {} });
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
        sourceQueueRef.current = sourceQueueRef.current.filter((s) => s !== source);
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
        newBuf.set(buffer);
        newBuf.set(value, buffer.length);
        buffer = newBuf;

        if (buffer.length >= CHUNK_SIZE) {
          const toPlay = buffer.slice(0, CHUNK_SIZE);
          buffer = buffer.slice(CHUNK_SIZE);
          playChunk(toPlay.buffer.slice(toPlay.byteOffset, toPlay.byteOffset + toPlay.byteLength));
        }
      }
    } catch (e) {
      console.error("TTS error:", e);
      setCallState("idle");
    }
  }, [playChunk, stopAudio]);

  const sendToTutor = useCallback(async (msgs: Message[]) => {
    setCallState("thinking");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
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
      const hintLine = lines.find((l) => l.startsWith("💡"));
      const germanText = lines.filter((l) => !l.startsWith("💡")).join(" ").trim();

      const assistantMsg: Message = {
        role: "assistant",
        content: germanText,
        translation: hintLine?.replace("💡 ", ""),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await streamTTS(germanText);
    } catch (e) {
      console.error("Chat error:", e);
      setError("Something went wrong. Please try again.");
      setCallState("idle");
    }
  }, [streamTTS]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      finalBufferRef.current += text;
      setLiveText(finalBufferRef.current);
    } else {
      setLiveText(finalBufferRef.current + text);
    }
  }, []);

  const handleRecordingEnd = useCallback(() => {
    if (isSendingRef.current) return;
    if (isSendingRef.current) return;
    const userText = finalBufferRef.current.trim();
    finalBufferRef.current = "";
    setLiveText("");
    if (!userText) { setCallState("idle"); return; }

    const userMsg: Message = { role: "user", content: userText, timestamp: Date.now() };
    isSendingRef.current = true;
    setMessages((prev) => [...prev, userMsg]);
    sendToTutor([...messages, userMsg]).finally(() => {
      isSendingRef.current = false;
    });
  }, [sendToTutor, messages]);

  const { start, stop } = useSpeechRecorder({
    apiKey: process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "",
    onTranscript: handleTranscript,
    onEnd: handleRecordingEnd,
    onError: (e) => { setError(e); setCallState("idle"); },
    onVolume: setVolumeLevel,
    onSpeechStart: () => setCallState("listening"),
  });

  const generateReport = () => {
    const userText = messages
      .filter(m => m.role === "user")
      .map(m => m.content.toLowerCase())
      .join(" ");

    const felixText = messages
      .filter(m => m.role === "assistant")
      .map(m => m.content)
      .join(" ");

    // Extract German words Felix used (4+ chars, letters only)
    const felixWords = Array.from(new Set(
      felixText.match(/[a-zA-ZäöüÄÖÜß]{4,}/g) || []
    ));

    // Filter to words user never said
    const userWords = new Set(
      (userText.match(/[a-zA-ZäöüÄÖÜß]{3,}/g) || []).map(w => w.toLowerCase())
    );

    const common = ["dass", "eine", "einen", "einem", "einer", "nicht", "auch",
      "noch", "oder", "aber", "dein", "mein", "sein", "haben", "waren", "wird",
      "wird", "sind", "hast", "habe", "kann", "wenn", "dann", "über", "nach",
      "mehr", "sehr", "sich", "beim", "beim", "beim", "wäre", "beim", "beim"];

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
    } else {
      // End the call
      stop();
      setCallState("idle");
    }
  };

  const saveSession = async () => {
    const session: Session = {
      id: sessionId, startedAt: sessionStart, endedAt: Date.now(), messages,
      title: messages[0]?.content?.slice(0, 60) ?? "Gespräch",
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
    speaking: "Felix spricht... (drücken zum Unterbrechen)",
  };

  const bars = Array.from({ length: 7 });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoDE}>DE</span>
          <span className={styles.logoText}>Deutsch Tutor</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/history" className={styles.navLink}>Verlauf</Link>
          {messages.length > 0 && (
            <button className={styles.saveBtn} onClick={generateReport} style={{borderColor: 'rgba(192,57,43,0.4)', color: 'var(--red)'}}>
              Beenden
            </button>
          )}
          {messages.length > 0 && !saved && <button className={styles.saveBtn} onClick={saveSession}>Speichern</button>}
          {saved && <span className={styles.savedBadge}>✓ Gespeichert</span>}
          <div className={styles.providerToggle}>
            <button
              className={`${styles.providerBtn} ${ttsProvider === "soniox" ? styles.providerBtnActive : ""}`}
              onClick={() => setTtsProvider("soniox")}
            >Soniox</button>
            <button
              className={`${styles.providerBtn} ${ttsProvider === "fish" ? styles.providerBtnActive : ""}`}
              onClick={() => setTtsProvider("fish")}
            >Fish 🐟</button>
          </div>
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
          <p className={styles.felixLabel}>Felix — dein Deutschlehrer</p>
          <p className={styles.levelBadge}>B1/B2</p>
        </div>

        <div className={styles.transcript}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Bereit zum Üben?</p>
              <p className={styles.emptyHint}>Drücke den Knopf und sprich auf Deutsch.<br />Felix antwortet sofort und hilft dir mit der Grammatik.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}>
              <div className={styles.bubbleRole}>{msg.role === "user" ? "Du" : "Felix"}</div>
              <p className={styles.bubbleText}>{msg.content}</p>
              {msg.translation && <p className={styles.bubbleHint}>💡 {msg.translation}</p>}
              <span className={styles.bubbleTime}>{new Date(msg.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          ))}
          {liveText && (
            <div className={`${styles.bubble} ${styles.userBubble} ${styles.livePreview}`}>
              <div className={styles.bubbleRole}>Du</div>
              <p className={styles.bubbleText}>{liveText}<span className={styles.cursor} /></p>
            </div>
          )}
          {callState === "thinking" && (
            <div className={`${styles.bubble} ${styles.assistantBubble}`}>
              <div className={styles.bubbleRole}>Felix</div>
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
              {bars.map((_, i) => (
                <div key={i} className={styles.bar} style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          ) : callState === "thinking" ? (
            <div className={styles.spinner} />
          ) : callState === "speaking" ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
      </main>
    </div>
  );
}
