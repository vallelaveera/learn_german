"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Message } from "@/lib/types";
import { parseTutorResponse, attachCorrectionToLastUser, markLastUserGrammarCorrect } from "@/lib/tutor-response";
import { CallGrammarProgressHud, CallGrammarTurnBadge } from "@/components/call/CallGrammarProgress";
import { isFarewellUtterance, buildGoodbyePromptSuffix } from "@/lib/call-farewell";
import { buildCallContextUrl } from "@/lib/grammar/context-url";
import { useCallUsageBilling } from "@/components/billing/useCallUsageBilling";
import {
  getAllGermanVoices,
  getGermanFemaleVoice,
  initGermanTTS,
  speakGerman,
  stopSpeaking,
  whenGermanSpeechIdle,
} from "@/lib/tts/german-tts";
import styles from "@/app/call/call.module.css";

type CallState = "idle" | "listening" | "thinking" | "speaking";

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  }
}

export interface BrowserCallProps {
  onCallEnded?: (messages: Message[], durationSec: number) => void;
  embedded?: boolean;
  scenarioId?: string | null;
  grammarId?: string | null;
}

let _isSending = false;

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function BrowserCall({ onCallEnded, embedded, scenarioId, grammarId }: BrowserCallProps = {}) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const systemPromptRef = useRef<string | undefined>();
  const pendingHomeworkRepsRef = useRef(0);
  const [user, setUser] = useState<{ name: string; streak: number } | null>(null);
  const [daysSince, setDaysSince] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);
  const pendingEndRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const conversationActiveRef = useRef(false);
  const sendToGptRef = useRef<(msgs: Message[]) => Promise<void>>(async () => {});
  const resumeListeningRef = useRef<() => void>(() => {});
  const router = useRouter();
  const finishSessionRef = useRef<() => void>(() => {});

  useCallUsageBilling({
    sessionId,
    sessionStart,
    active: callState !== "idle",
    onLimitReached: () => finishSessionRef.current(),
  });

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const resolvedVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (selectedVoiceUri) {
      return voices.find(v => v.voiceURI === selectedVoiceUri) ?? getGermanFemaleVoice();
    }
    return getGermanFemaleVoice();
  }, [selectedVoiceUri, voices]);

  const resumeListening = useCallback(() => {
    if (
      !conversationActiveRef.current
      || pendingEndRef.current
      || _isSending
      || !sttSupported
      || !recognitionRef.current
    ) return;
    if (callStateRef.current === "thinking" || callStateRef.current === "speaking") return;
    try {
      setCallState("listening");
      recognitionRef.current.start();
    } catch {
      setCallState("idle");
    }
  }, [sttSupported]);

  useEffect(() => { resumeListeningRef.current = resumeListening; }, [resumeListening]);

  const afterMayaSpeech = useCallback(() => {
    setCallState("idle");
    resumeListeningRef.current();
  }, []);

  useEffect(() => {
    const Recognition = getSpeechRecognitionCtor();
    setSttSupported(!!Recognition);
    setTtsSupported(typeof window !== "undefined" && !!window.speechSynthesis);

    void initGermanTTS().then(found => {
      setVoices(found);
      const googleDeutsch = found.find(v =>
        v.name === "Google Deutsch" || v.name.includes("Google Deutsch"),
      );
      if (googleDeutsch) setSelectedVoiceUri(googleDeutsch.voiceURI);
    });

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript || _isSending) {
        setCallState("idle");
        return;
      }
      _isSending = true;
      const userMsg: Message = { role: "user", content: transcript, timestamp: Date.now() };
      const updated = [...messagesRef.current, userMsg];
      setMessages(updated);
      messagesRef.current = updated;
      void sendToGptRef.current(updated);
    };

    recognition.onerror = () => {
      setCallState("idle");
    };

    recognition.onend = () => {
      if (callStateRef.current === "listening" && !_isSending) {
        setCallState("idle");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
      stopSpeaking();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const contextUrl = buildCallContextUrl({ scenarioId, grammarId });
    fetch(contextUrl)
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        setSystemPrompt(data.systemPrompt);
        systemPromptRef.current = data.systemPrompt;
        if (data.homeworkSummary?.remainingReps != null) {
          pendingHomeworkRepsRef.current = data.homeworkSummary.remainingReps;
        }
        setUser({ name: data.user.name, streak: data.streak ?? 0 });
        setDaysSince(data.daysSinceLastCall ?? 0);
        if (data.opening) {
          const msg: Message = { role: "assistant", content: data.opening, timestamp: Date.now() };
          setMessages([msg]);
          messagesRef.current = [msg];
          conversationActiveRef.current = true;
          if (!mutedRef.current && ttsSupported) {
            setCallState("speaking");
            speakGerman(data.opening, resolvedVoice(), 0.9, afterMayaSpeech);
          } else {
            resumeListeningRef.current();
          }
        }
      })
      .catch(console.error);
  }, [router, scenarioId, grammarId, resolvedVoice, ttsSupported, afterMayaSpeech]);

  const speakStreamSentences = useCallback((token: string, state: {
    buffer: string;
    spokenCount: number;
  }) => {
    if (mutedRef.current || !ttsSupported) return;
    state.buffer += token;
    const speakable = state.buffer.split("💡")[0];
    const sentences = speakable.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
    if (sentences.length > state.spokenCount) {
      const newSentences = sentences.slice(state.spokenCount);
      newSentences.forEach(s => speakGerman(s.trim(), resolvedVoice()));
      state.spokenCount = sentences.length;
    }
  }, [resolvedVoice, ttsSupported]);

  const sendToGpt = useCallback(async (msgs: Message[]) => {
    setCallState("thinking");
    stopSpeaking();

    try {
      const lastUser = [...msgs].reverse().find(m => m.role === "user");
      const ending = lastUser ? isFarewellUtterance(lastUser.content) : false;
      if (ending) pendingEndRef.current = true;

      let prompt = systemPromptRef.current ?? systemPrompt ?? "";
      if (ending) {
        prompt += buildGoodbyePromptSuffix(pendingHomeworkRepsRef.current);
      }

      const res = await fetch("/api/chat-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, systemPrompt: prompt }),
      });
      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buf = "";
      const streamState = { buffer: "", spokenCount: 0 };
      setCallState("speaking");

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
            if (p.text) {
              fullText += p.text;
              speakStreamSentences(p.text, streamState);
            }
          } catch {}
        }
      }

      if (!fullText) throw new Error();

      const parsed = parseTutorResponse(fullText);
      const germanSentences = parsed.german.match(/[^.!?]+[.!?]+(\s|$)/g)
        ?? (parsed.german.trim() ? [parsed.german] : []);
      const unspoken = germanSentences.slice(streamState.spokenCount);
      if (!mutedRef.current && ttsSupported) {
        unspoken.forEach(s => speakGerman(s.trim(), resolvedVoice()));
      }

      if (!mutedRef.current && ttsSupported && (streamState.spokenCount > 0 || unspoken.length > 0)) {
        whenGermanSpeechIdle(afterMayaSpeech);
      } else {
        afterMayaSpeech();
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: parsed.german,
        translation: parsed.hint,
        timestamp: Date.now(),
      };

      setMessages(() => {
        let updated = msgs;
        if (parsed.correction) {
          updated = attachCorrectionToLastUser(updated, parsed.correction);
        } else {
          updated = markLastUserGrammarCorrect(updated);
        }
        updated = [...updated, assistantMsg];
        messagesRef.current = updated;
        return updated;
      });
      _isSending = false;
    } catch {
      _isSending = false;
      setCallState("idle");
    }
  }, [systemPrompt, speakStreamSentences, resolvedVoice, ttsSupported, afterMayaSpeech]);

  useEffect(() => { sendToGptRef.current = sendToGpt; }, [sendToGpt]);

  const finishSession = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    conversationActiveRef.current = false;
    _isSending = false;
    recognitionRef.current?.abort();
    stopSpeaking();
    setCallState("idle");
    const dur = Math.max(0, Math.round((Date.now() - sessionStart) / 1000));
    const finalMessages = [...messagesRef.current];
    if (finalMessages.length > 1) {
      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: finalMessages,
          sessionStart,
          sessionEnd: Date.now(),
          sessionId,
        }),
      }).catch(() => {});
      onCallEnded?.(finalMessages, dur);
    }
    setMessages([]);
    messagesRef.current = [];
  }, [sessionStart, onCallEnded, sessionId]);

  useEffect(() => { finishSessionRef.current = finishSession; }, [finishSession]);

  useEffect(() => {
    if (callState !== "idle") return;
    if (pendingEndRef.current) {
      pendingEndRef.current = false;
      finishSession();
    }
  }, [callState, finishSession]);

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      if (next) stopSpeaking();
      return next;
    });
  };

  const handleMicButton = () => {
    if (!sttSupported || !recognitionRef.current) return;
    if (navigator.vibrate) navigator.vibrate(40);

    if (callState === "speaking") {
      stopSpeaking();
      afterMayaSpeech();
      return;
    }
    if (callState === "listening") {
      recognitionRef.current.stop();
      setCallState("idle");
      return;
    }
    if (callState === "thinking") return;

    conversationActiveRef.current = true;
    try {
      setCallState("listening");
      recognitionRef.current.start();
    } catch {
      setCallState("idle");
    }
  };

  const generateReport = () => {
    if (callState === "speaking" || callState === "thinking") {
      pendingEndRef.current = true;
      stopSpeaking();
      return;
    }
    finishSession();
  };

  const stateLabel: Record<CallState, string> = {
    idle: sttSupported ? "Sprich mit Maya — Mikrofon ist bereit" : "Spracherkennung wird in diesem Browser nicht unterstützt",
    listening: "Sprich jetzt...",
    thinking: "Maya denkt nach...",
    speaking: "Maya spricht — tippen zum Überspringen",
  };

  const bars = Array.from({ length: 7 });

  const rootStyle = embedded
    ? {
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        background: "var(--bg)",
      }
    : undefined;

  return (
    <div className={embedded ? undefined : styles.page} style={rootStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderBottom: "0.5px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {voices.length > 0 ? (
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
            Maya&apos;s Stimme
            <select
              value={selectedVoiceUri ?? ""}
              onChange={e => setSelectedVoiceUri(e.target.value || null)}
              style={{
                width: "100%",
                minHeight: 36,
                borderRadius: 8,
                border: "0.5px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                padding: "4px 8px",
              }}
            >
              <option value="">Google Deutsch (Auto)</option>
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <p style={{ flex: 1, fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            Keine deutschen Stimmen gefunden — Standardstimme wird verwendet
          </p>
        )}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Stumm aus" : "Stumm"}
          style={{
            minWidth: 44,
            minHeight: 44,
            borderRadius: 8,
            border: "0.5px solid var(--border)",
            background: muted ? "var(--accent-glow)" : "var(--surface)",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {embedded && messages.length > 0 && (
        <div style={{ padding: "8px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <CallGrammarProgressHud messages={messages} />
          {messages.length > 1 && (
            <button
              type="button"
              onClick={generateReport}
              style={{ minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer", flexShrink: 0 }}
            >
              {pendingEndRef.current ? "..." : "Ende"}
            </button>
          )}
        </div>
      )}

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
            {user?.streak ? `${user.streak} Tage` : "Deutsche Lehrerin"}
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
            <p className={styles.bubbleText}>{msg.content.replace(/<end>/g, "").trim()}</p>
            {msg.role === "user" && <CallGrammarTurnBadge msg={msg} />}
            {msg.translation && <p className={styles.bubbleHint}>{msg.translation}</p>}
            <span className={styles.bubbleTime}>
              {new Date(msg.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        ))}
        {callState === "thinking" && (
          <div className={`${styles.bubble} ${styles.assistantBubble}`}>
            <div className={styles.bubbleRole}>Maya</div>
            <div className={styles.thinkingDots}><span /><span /><span /></div>
          </div>
        )}
      </div>

      <div className={styles.bottom}>
        <p className={styles.status}>{stateLabel[callState]}</p>
        <button
          className={`${styles.callBtn} ${callState === "listening" ? styles.callBtnListening : ""} ${callState === "speaking" ? styles.callBtnSpeaking : ""} ${callState === "thinking" ? styles.callBtnThinking : ""}`}
          onClick={handleMicButton}
          disabled={!sttSupported || callState === "thinking"}
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
