"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Message } from "@/lib/types";
import { parseTutorResponse, attachCorrectionToLastUser, markLastUserGrammarCorrect } from "@/lib/tutor-response";
import { CallGrammarTurnBadge } from "@/components/call/CallGrammarProgress";
import { isFarewellUtterance, buildGoodbyePromptSuffix } from "@/lib/call-farewell";
import { buildCallContextUrl } from "@/lib/grammar/context-url";
import { useCallUsageBilling } from "@/components/billing/useCallUsageBilling";
import {
  getGermanFemaleVoice,
  initGermanTTS,
  speakGerman,
  stopSpeaking,
  whenGermanSpeechIdle,
} from "@/lib/tts/german-tts";

type Phase = "idle" | "active";
type CallState = "listening" | "thinking" | "speaking";

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

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

let _bc_active = false;
let _isSending = false;

const SILENCE_DURATION_MS = 2000;

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function ensureMicPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

const fallbackOpening = (name?: string) =>
  name
    ? `Hallo ${name}! Schön, dass du da bist. Wie geht's dir?`
    : "Hallo! Schön, dass du da bist. Wie geht's dir?";

export function BrowserCall({ onCallEnded, embedded, scenarioId, grammarId }: BrowserCallProps = {}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [callState, setCallState] = useState<CallState>("listening");
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState("");
  const [duration, setDuration] = useState(0);
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const systemPromptRef = useRef<string | undefined>();
  const pendingHomeworkRepsRef = useRef(0);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [cachedOpening, setCachedOpening] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sttSupported, setSttSupported] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showJetztDuNudge, setShowJetztDuNudge] = useState(false);
  const [showMayaReplyNudge, setShowMayaReplyNudge] = useState(false);

  const pendingEndRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const callStateRef = useRef<CallState>("listening");
  const isMutedRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speechBufferRef = useRef("");
  const interimRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sendToGptRef = useRef<(msgs: Message[]) => Promise<void>>(async () => {});
  const commitTurnRef = useRef<() => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});
  const endCallRef = useRef<() => void>(() => {});
  const router = useRouter();

  useCallUsageBilling({
    sessionId,
    sessionStart,
    active: phase === "active",
    onLimitReached: () => endCallRef.current(),
  });

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveText, callState]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {}
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!_bc_active || _isSending || isMutedRef.current || !recognitionRef.current) return;
    if (callStateRef.current !== "listening") return;
    try {
      recognitionRef.current.start();
    } catch {}
  }, []);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { stopListeningRef.current = stopListening; }, [stopListening]);

  const scheduleSilenceSend = useCallback(() => {
    if (!_bc_active || _isSending || isMutedRef.current) return;
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      commitTurnRef.current();
    }, SILENCE_DURATION_MS);
  }, [clearSilenceTimer]);

  const afterMayaSpeech = useCallback(() => {
    if (!_bc_active) return;
    if (pendingEndRef.current) {
      pendingEndRef.current = false;
      endCallRef.current();
      return;
    }
    setCallState("listening");
    setShowJetztDuNudge(true);
    setShowMayaReplyNudge(false);
    speechBufferRef.current = "";
    interimRef.current = "";
    setLiveText("");
    startListeningRef.current();
  }, []);

  const speakStreamSentences = useCallback((token: string, state: {
    buffer: string;
    spokenCount: number;
  }) => {
    state.buffer += token;
    const speakable = state.buffer.split("💡")[0];
    const sentences = speakable.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
    if (sentences.length > state.spokenCount) {
      const newSentences = sentences.slice(state.spokenCount);
      newSentences.forEach(s => speakGerman(s.trim(), voiceRef.current));
      state.spokenCount = sentences.length;
    }
  }, []);

  const sendToGpt = useCallback(async (msgs: Message[]) => {
    setCallState("thinking");
    setShowMayaReplyNudge(true);
    setShowJetztDuNudge(false);
    stopListeningRef.current();
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
      unspoken.forEach(s => speakGerman(s.trim(), voiceRef.current));

      if (streamState.spokenCount > 0 || unspoken.length > 0) {
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
      if (_bc_active) afterMayaSpeech();
    }
  }, [systemPrompt, speakStreamSentences, afterMayaSpeech]);

  useEffect(() => { sendToGptRef.current = sendToGpt; }, [sendToGpt]);

  const commitTurn = useCallback(() => {
    if (_isSending || !_bc_active || isMutedRef.current) return;
    const text = (speechBufferRef.current + interimRef.current).replace(/<end>/g, "").trim();
    if (!text) return;

    speechBufferRef.current = "";
    interimRef.current = "";
    setLiveText("");
    clearSilenceTimer();
    stopListeningRef.current();
    _isSending = true;

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;
    void sendToGptRef.current(updated);
  }, [clearSilenceTimer]);

  useEffect(() => { commitTurnRef.current = commitTurn; }, [commitTurn]);

  useEffect(() => {
    const Recognition = getSpeechRecognitionCtor();
    setSttSupported(!!Recognition);

    void initGermanTTS().then(() => {
      voiceRef.current = getGermanFemaleVoice();
    });

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = event => {
      if (!_bc_active || _isSending || isMutedRef.current || callStateRef.current !== "listening") return;

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          speechBufferRef.current += chunk;
        } else {
          interim += chunk;
        }
      }
      interimRef.current = interim;
      setLiveText(speechBufferRef.current + interim);
      setShowJetztDuNudge(false);
      scheduleSilenceSend();
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (_bc_active) setError("Spracherkennung unterbrochen — bitte erneut versuchen.");
    };

    recognition.onend = () => {
      if (
        _bc_active
        && callStateRef.current === "listening"
        && !_isSending
        && !isMutedRef.current
      ) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      _bc_active = false;
      recognition.abort();
      recognitionRef.current = null;
      clearSilenceTimer();
      stopSpeaking();
    };
  }, [scheduleSilenceSend, clearSilenceTimer]);

  useEffect(() => {
    const contextUrl = buildCallContextUrl({ scenarioId, grammarId });
    fetch(contextUrl)
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data || data.error) return;
        if (data.limitReached) {
          setLimitReached(true);
          if (data.user) setUser({ name: data.user.name });
          return;
        }
        setUser({ name: data.user.name });
        systemPromptRef.current = data.systemPrompt;
        setSystemPrompt(data.systemPrompt);
        if (data.homeworkSummary?.remainingReps != null) {
          pendingHomeworkRepsRef.current = data.homeworkSummary.remainingReps;
        }
        if (data.opening) {
          setCachedOpening(data.opening);
        }
      })
      .catch(console.error)
      .finally(() => setContextReady(true));
  }, [router, scenarioId, grammarId]);

  const startCall = useCallback(async () => {
    if (!sttSupported) {
      setError("Spracherkennung wird in diesem Browser nicht unterstützt.");
      return;
    }
    if (navigator.vibrate) navigator.vibrate(40);

    _bc_active = true;
    _isSending = true;
    pendingEndRef.current = false;
    setError(null);
    setLiveText("");
    setDuration(0);
    speechBufferRef.current = "";
    interimRef.current = "";
    isMutedRef.current = false;
    setIsMuted(false);

    const micOk = await ensureMicPermission();
    if (!micOk) {
      _bc_active = false;
      _isSending = false;
      setError("Mikrofon-Zugriff nötig — bitte erlauben und erneut starten.");
      return;
    }

    await initGermanTTS();
    voiceRef.current = getGermanFemaleVoice();

    try {
      if ("wakeLock" in navigator) await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request("screen");
    } catch {}

    durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    setPhase("active");

    let opening = cachedOpening;
    if (!opening) {
      try {
        const r = await fetch(buildCallContextUrl({ scenarioId, grammarId }));
        const data = await r.json();
        if (data?.opening) opening = data.opening;
        if (data?.systemPrompt) {
          systemPromptRef.current = data.systemPrompt;
          setSystemPrompt(data.systemPrompt);
        }
      } catch {}
    }
    if (!opening) opening = fallbackOpening(user?.name);

    const msg: Message = { role: "assistant", content: opening, timestamp: Date.now() };
    setMessages([msg]);
    messagesRef.current = [msg];
    setCallState("speaking");
    _isSending = false;

    speakGerman(opening, voiceRef.current, 0.9, afterMayaSpeech);
  }, [sttSupported, cachedOpening, scenarioId, grammarId, user?.name, afterMayaSpeech]);

  const endCall = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    _bc_active = false;
    _isSending = false;
    pendingEndRef.current = false;
    clearSilenceTimer();
    stopListeningRef.current();
    stopSpeaking();
    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }

    const finalDuration = duration;
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
      onCallEnded?.(finalMessages, finalDuration);
    }

    setPhase("idle");
    setMessages([]);
    messagesRef.current = [];
    setLiveText("");
    setDuration(0);
    setCallState("listening");
    setShowJetztDuNudge(false);
    setShowMayaReplyNudge(false);
  }, [clearSilenceTimer, sessionStart, sessionId, duration, onCallEnded]);

  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next) {
      clearSilenceTimer();
      speechBufferRef.current = "";
      interimRef.current = "";
      setLiveText("");
      stopListeningRef.current();
    } else if (_bc_active && callStateRef.current === "listening") {
      startListeningRef.current();
    }
  }, [clearSilenceTimer]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const canCall = contextReady && !limitReached && sttSupported;

  if (phase === "idle") {
    return (
      <div style={{
        flex: embedded ? 1 : undefined,
        minHeight: embedded ? 0 : "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        paddingTop: "calc(env(safe-area-inset-top,0px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)",
      }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>
          Maya ruft an{user ? `, ${user.name}` : ""}
        </p>
        <p style={{ fontSize: 12, color: "#8a7060", marginBottom: 24, textAlign: "center", lineHeight: 1.7, maxWidth: 280 }}>
          Sprich einfach — Maya hört automatisch zu und antwortet wenn du fertig bist
        </p>

        {!sttSupported && (
          <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 16, textAlign: "center", maxWidth: 280 }}>
            Spracherkennung wird in diesem Browser nicht unterstützt
          </p>
        )}

        {contextReady && limitReached && (
          <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 16, textAlign: "center" }}>
            Monatslimit erreicht
          </p>
        )}

        {error && (
          <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 16, textAlign: "center", maxWidth: 280 }}>{error}</p>
        )}

        <div style={{ position: "relative", width: 80, height: 80, marginBottom: 32 }}>
          {!canCall && !limitReached && (
            <div
              aria-hidden
              style={{
                position: "absolute", inset: -5, borderRadius: "50%",
                border: "3px solid rgba(212,168,67,0.15)",
                borderTopColor: "var(--accent)",
                animation: "spin 0.9s linear infinite",
              }}
            />
          )}
          <button
            type="button"
            onClick={() => void startCall()}
            disabled={!canCall}
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: canCall ? "var(--green)" : limitReached ? "var(--border)" : "var(--surface)",
              border: canCall ? "none" : "2px solid var(--accent-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: canCall ? "pointer" : "not-allowed",
              opacity: limitReached ? 0.45 : 1,
              boxShadow: canCall ? "0 0 0 12px rgba(39,174,96,0.12), 0 0 0 24px rgba(39,174,96,0.06)" : "none",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill={canCall ? "white" : limitReached ? "rgba(255,255,255,0.3)" : "var(--accent)"}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const callControlsBottom = embedded
    ? "calc(82px + env(safe-area-inset-bottom, 0px))"
    : "env(safe-area-inset-bottom, 0px)";

  return (
    <div
      style={{
        position: "fixed",
        top: embedded ? "calc(env(safe-area-inset-top, 0px) + 58px)" : 0,
        right: 0,
        bottom: callControlsBottom,
        left: 0,
        maxWidth: 390,
        margin: "0 auto",
        zIndex: 90,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid #e8e0f0", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isMuted && callState === "listening" ? "var(--border)" : callState === "speaking" ? "var(--green)" : callState === "listening" ? "var(--accent)" : "var(--border)",
            boxShadow: isMuted && callState === "listening" ? "none" : callState === "speaking" ? "0 0 6px rgba(39,174,96,0.6)" : callState === "listening" ? "0 0 6px rgba(212,168,67,0.6)" : "none",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: "#8a7060", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {isMuted && callState === "listening" ? "STUMM" : callState === "listening" ? "HOERT ZU" : callState === "thinking" ? "DENKT NACH" : "SPRICHT"}
          </span>
        </div>
        <span style={{ fontSize: 13, color: "#8a7060", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{fmt(duration)}</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          margin: "8px 12px 0",
          borderRadius: 16,
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          boxShadow: "0 2px 16px rgba(45, 32, 24, 0.05)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, WebkitOverflowScrolling: "touch" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ maxWidth: "85%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "linear-gradient(135deg, #7c4daa, #e8643a)" : "#f0ebff",
                border: `0.5px solid ${msg.role === "user" ? "transparent" : "#ddd5f0"}`,
              }}>
                <div style={{ fontSize: 10, color: msg.role === "assistant" ? "var(--accent)" : "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {msg.role === "user" ? (user?.name ?? "Du") : "Maya"}
                </div>
                <p style={{ fontSize: 14, color: msg.role === "user" ? "#ffffff" : "#2d1f1a", lineHeight: 1.6, margin: 0 }}>
                  {msg.content.replace(/<end>/g, "").trim()}
                </p>
                {msg.role === "user" && <CallGrammarTurnBadge msg={msg} inverted />}
                {msg.translation && msg.role === "assistant" && (
                  <p style={{ fontSize: 11, color: "#7c4daa", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>💡 {msg.translation}</p>
                )}
              </div>
            </div>
          ))}

          {showJetztDuNudge && callState === "listening" && !liveText && (
            <div style={{ maxWidth: "85%", alignSelf: "flex-start" }}>
              <div style={{ padding: "8px 14px", borderRadius: 20, background: "rgba(212,168,67,0.14)", border: "1px solid rgba(212,168,67,0.35)" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#7c4daa", margin: 0 }}>Jetzt du — sprich laut</p>
              </div>
            </div>
          )}

          {showMayaReplyNudge && callState === "thinking" && (
            <div style={{ maxWidth: "85%", alignSelf: "flex-end" }}>
              <div style={{ padding: "8px 14px", borderRadius: 20, background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.35)" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#1D9E75", margin: 0 }}>Verstanden — Maya antwortet</p>
              </div>
            </div>
          )}

          {liveText && callState === "listening" && (
            <div style={{ maxWidth: "85%", alignSelf: "flex-end" }}>
              <div style={{ padding: "10px 14px", borderRadius: "16px 16px 4px 16px", background: "linear-gradient(135deg, #7c4daa, #e8643a)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{user?.name ?? "Du"}</div>
                <p style={{ fontSize: 14, color: "#ffffff", lineHeight: 1.6, margin: 0 }}>
                  {liveText.replace(/<end>/g, "").trim()}
                  <span style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(255,255,255,0.85)", marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" }} />
                </p>
              </div>
            </div>
          )}

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
      </div>

      <div style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "6px 16px 8px",
        borderTop: "0.5px solid #e8e0f0",
        background: "var(--bg)",
        boxShadow: "0 -2px 10px rgba(45, 32, 24, 0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 18 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const height = isMuted
              ? 3
              : callState === "listening"
              ? 5 + Math.abs(Math.sin((Date.now() / 200 + i) * 0.7)) * 10
              : callState === "speaking"
              ? 5 + Math.abs(Math.sin(i * 0.8)) * 8
              : 3;
            return (
              <div key={i} style={{
                width: 3, borderRadius: 2, height: `${height}px`,
                background: callState === "speaking"
                  ? `rgba(39,174,96,${0.4 + i * 0.06})`
                  : callState === "listening" && !isMuted
                  ? `rgba(212,168,67,${0.4 + i * 0.06})`
                  : "rgba(127,119,221,0.15)",
              }} />
            );
          })}
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--red)", margin: 0, textAlign: "center" }}>{error}</p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Mikrofon einschalten" : "Mikrofon stummschalten"}
            aria-pressed={isMuted}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              background: isMuted ? "rgba(192,57,43,0.12)" : "var(--surface)",
              border: `1.5px solid ${isMuted ? "rgba(192,57,43,0.45)" : "var(--accent-dim)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {isMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={endCall}
            aria-label="Anruf beenden"
            style={{
              width: 50, height: 50, borderRadius: "50%",
              background: "rgba(192,57,43,0.9)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 3px 12px rgba(192,57,43,0.28)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
