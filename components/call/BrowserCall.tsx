"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useCallRecorder } from "@/components/CallRecorder";
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

export interface BrowserCallProps {
  onCallEnded?: (messages: Message[], durationSec: number) => void;
  embedded?: boolean;
  scenarioId?: string | null;
  grammarId?: string | null;
}

let _bc_active = false;
let _bc_sending = false;
let _bc_mic_start = 0;
let _bc_mic_running = false;

const SPEECH_THRESHOLD = 42;
const SILENCE_THRESHOLD = 30;
const SPEECH_FRAMES_MIN = 12;
const SILENCE_DURATION_ENDPOINT = 2000;
const SILENCE_DURATION_FALLBACK = 2000;
const MIC_WARMUP_MS = 1000;
const PAUSE_BETWEEN_TURNS_MS = 250;

const looksIncomplete = (text: string) => {
  const t = text.trim();
  if (!t) return true;
  if (/\s[a-zäöüß]$/i.test(t)) return true;
  const last = t.split(/\s+/).pop()?.replace(/[.!?,…:;]+$/g, "") ?? "";
  if (last.length === 1 && !/[.!?]$/.test(t)) return true;
  return false;
};

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
  const [volume, setVolume] = useState(0);
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
  const [isMuted, setIsMuted] = useState(false);
  const [jetztDuActive, setJetztDuActive] = useState(false);
  const [showJetztDuNudge, setShowJetztDuNudge] = useState(false);
  const [showMayaReplyNudge, setShowMayaReplyNudge] = useState(false);

  const pendingEndRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const callStateRef = useRef<CallState>("listening");
  const isMutedRef = useRef(false);
  const jetztDuRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speechBufferRef = useRef("");
  const nonFinalRef = useRef("");
  const isSpeakingRef = useRef(false);
  const speechFramesRef = useRef(0);
  const sttEndpointRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const micLiveRef = useRef(false);
  const ttsSessionRef = useRef(0);

  const sendToGptRef = useRef<(msgs: Message[]) => Promise<void>>(async () => {});
  const tryCommitTurnRef = useRef<(force?: boolean) => void>(() => {});
  const startRef = useRef<() => Promise<void>>(async () => {});
  const stopRef = useRef<() => Promise<Blob | null>>(async () => null);
  const setMutedRef = useRef<(muted: boolean) => void>(() => {});
  const setTranscriptPausedRef = useRef<(paused: boolean) => void>(() => {});
  const restartMicRef = useRef<() => Promise<void>>(async () => {});
  const activateMicAfterTTSRef = useRef<() => Promise<void>>(async () => {});
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
  useEffect(() => { jetztDuRef.current = jetztDuActive; }, [jetztDuActive]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveText, callState]);

  const setJetztDu = useCallback((active: boolean) => {
    jetztDuRef.current = active;
    setJetztDuActive(active);
    if (active) setShowJetztDuNudge(true);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const scheduleSilenceSend = useCallback(() => {
    if (silenceTimerRef.current) return;
    const duration = sttEndpointRef.current ? SILENCE_DURATION_ENDPOINT : SILENCE_DURATION_FALLBACK;
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      tryCommitTurnRef.current();
    }, duration);
  }, []);

  const activateMicAfterTTS = useCallback(async () => {
    if (!_bc_active) return;
    if (pendingEndRef.current) {
      pendingEndRef.current = false;
      endCallRef.current();
      return;
    }
    await new Promise(resolve => setTimeout(resolve, PAUSE_BETWEEN_TURNS_MS));
    if (!_bc_active) return;
    await restartMicRef.current();
  }, []);

  const restartMic = useCallback(async () => {
    if (!_bc_active || _bc_mic_running) return;
    _bc_mic_running = true;
    try {
      await stopRef.current();
      micLiveRef.current = false;
      if (!_bc_active) return;
      speechBufferRef.current = "";
      nonFinalRef.current = "";
      isSpeakingRef.current = false;
      speechFramesRef.current = 0;
      sttEndpointRef.current = false;
      setLiveText("");
      _bc_mic_start = Date.now();
      setTranscriptPausedRef.current(false);
      setJetztDu(true);
      setCallState("listening");
      await startRef.current();
      micLiveRef.current = true;
      if (isMutedRef.current) setMutedRef.current(true);
    } finally {
      _bc_mic_running = false;
    }
  }, [setJetztDu]);

  const speakMaya = useCallback((text: string) => {
    const session = ++ttsSessionRef.current;
    setShowMayaReplyNudge(false);
    setCallState("speaking");
    setJetztDu(false);
    setTranscriptPausedRef.current(true);
    speechBufferRef.current = "";
    nonFinalRef.current = "";
    setLiveText("");
    _bc_sending = true;
    void stopRef.current();

    const finish = () => {
      if (session !== ttsSessionRef.current) return;
      _bc_sending = false;
      void activateMicAfterTTSRef.current();
    };

    if (!text.trim()) {
      finish();
      return;
    }

    speakGerman(text, voiceRef.current, 0.9, () => {
      whenGermanSpeechIdle(finish);
    });
  }, [setJetztDu]);

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
    _bc_sending = true;
    setJetztDu(false);
    setCallState("thinking");
    setShowMayaReplyNudge(true);
    setTranscriptPausedRef.current(true);
    await stopRef.current();
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

      const finishSpeech = () => {
        _bc_sending = false;
        void activateMicAfterTTSRef.current();
      };

      if (streamState.spokenCount > 0 || unspoken.length > 0) {
        whenGermanSpeechIdle(finishSpeech);
      } else {
        finishSpeech();
      }

      setMessages(prev => {
        let updated = prev;
        if (parsed.correction) {
          updated = attachCorrectionToLastUser(updated, parsed.correction);
        } else {
          updated = markLastUserGrammarCorrect(updated);
        }
        const assistantMsg: Message = {
          role: "assistant",
          content: parsed.german,
          translation: parsed.hint,
          timestamp: Date.now(),
        };
        updated = [...updated, assistantMsg];
        messagesRef.current = updated;
        return updated;
      });
    } catch {
      _bc_sending = false;
      if (_bc_active) void restartMicRef.current();
    }
  }, [systemPrompt, speakStreamSentences, setJetztDu]);

  useEffect(() => { sendToGptRef.current = sendToGpt; }, [sendToGpt]);

  const tryCommitTurn = useCallback(async (force = false) => {
    if (_bc_sending || !_bc_active) return;
    clearSilenceTimer();

    if (nonFinalRef.current.trim()) {
      speechBufferRef.current += nonFinalRef.current;
      nonFinalRef.current = "";
    }

    const text = speechBufferRef.current.trim();
    if (!text) return;

    if (!force && looksIncomplete(text)) {
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        tryCommitTurnRef.current(true);
      }, sttEndpointRef.current ? 600 : 800);
      return;
    }

    isSpeakingRef.current = false;
    speechFramesRef.current = 0;
    speechBufferRef.current = "";
    nonFinalRef.current = "";
    sttEndpointRef.current = false;
    setLiveText("");
    setShowJetztDuNudge(false);

    const userMsg: Message = {
      role: "user",
      content: text.replace(/<end>/g, "").trim(),
      timestamp: Date.now(),
    };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;
    void sendToGptRef.current(updated);
  }, [clearSilenceTimer]);

  useEffect(() => { tryCommitTurnRef.current = (force?: boolean) => { void tryCommitTurn(force); }; }, [tryCommitTurn]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isMutedRef.current || !jetztDuRef.current) return;
    setShowJetztDuNudge(false);
    if (isFinal) {
      speechBufferRef.current += text;
      nonFinalRef.current = "";
      setLiveText(speechBufferRef.current);
      sttEndpointRef.current = false;
    } else {
      nonFinalRef.current = text;
      setLiveText(speechBufferRef.current + text);
      sttEndpointRef.current = false;
      clearSilenceTimer();
    }
  }, [clearSilenceTimer]);

  const handleFinished = useCallback(() => {
    if (!_bc_active || _bc_sending || isMutedRef.current || !jetztDuRef.current) return;
    sttEndpointRef.current = true;
    if (speechBufferRef.current.trim() || nonFinalRef.current.trim()) {
      clearSilenceTimer();
      scheduleSilenceSend();
    }
  }, [clearSilenceTimer, scheduleSilenceSend]);

  const handleVolume = useCallback((vol: number) => {
    if (isMutedRef.current) {
      setVolume(0);
      return;
    }
    if (callStateRef.current === "listening") setVolume(vol);
    if (!_bc_active || _bc_sending) return;
    if (Date.now() - _bc_mic_start < MIC_WARMUP_MS) return;

    if (vol >= SPEECH_THRESHOLD) {
      speechFramesRef.current++;
      if (speechFramesRef.current >= SPEECH_FRAMES_MIN) {
        isSpeakingRef.current = true;
        setShowJetztDuNudge(false);
      }
      sttEndpointRef.current = false;
    } else if (vol < SILENCE_THRESHOLD) {
      speechFramesRef.current = 0;
    }

    if (!isSpeakingRef.current) {
      clearSilenceTimer();
      return;
    }

    if (vol >= SILENCE_THRESHOLD) {
      clearSilenceTimer();
    } else if (speechBufferRef.current.trim() && !nonFinalRef.current.trim()) {
      scheduleSilenceSend();
    }
  }, [clearSilenceTimer, scheduleSilenceSend]);

  const handleRecorderError = useCallback((e: string) => {
    if (e.includes("429")) {
      setError("Zu viele Verbindungen. Bitte warte einen Moment.");
      endCallRef.current();
      return;
    }
    setError(e);
  }, []);

  const getContext = useCallback(() => {
    const lastMaya = [...messagesRef.current].reverse().find(m => m.role === "assistant");
    return lastMaya?.content ?? "";
  }, []);

  const { start, stop, setMuted, setTranscriptPaused } = useCallRecorder({
    apiKey: process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "",
    onTranscript: handleTranscript,
    onFinished: handleFinished,
    onError: handleRecorderError,
    onVolume: handleVolume,
    getContext,
  });

  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { stopRef.current = stop; }, [stop]);
  useEffect(() => { setMutedRef.current = setMuted; }, [setMuted]);
  useEffect(() => { setTranscriptPausedRef.current = setTranscriptPaused; }, [setTranscriptPaused]);
  useEffect(() => { restartMicRef.current = restartMic; }, [restartMic]);
  useEffect(() => { activateMicAfterTTSRef.current = activateMicAfterTTS; }, [activateMicAfterTTS]);

  useEffect(() => {
    void initGermanTTS().then(() => {
      voiceRef.current = getGermanFemaleVoice();
    });
  }, []);

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
        if (data.opening) setCachedOpening(data.opening);
      })
      .catch(console.error)
      .finally(() => setContextReady(true));
  }, [router, scenarioId, grammarId]);

  const startCall = useCallback(async () => {
    if (navigator.vibrate) navigator.vibrate(40);

    _bc_active = true;
    _bc_sending = true;
    pendingEndRef.current = false;
    setError(null);
    setLiveText("");
    setDuration(0);
    speechBufferRef.current = "";
    nonFinalRef.current = "";
    isMutedRef.current = false;
    setIsMuted(false);
    setJetztDu(false);

    const micOk = await ensureMicPermission();
    if (!micOk) {
      _bc_active = false;
      _bc_sending = false;
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
    speakMaya(opening);
  }, [cachedOpening, scenarioId, grammarId, user?.name, speakMaya, setJetztDu]);

  const endCall = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    _bc_active = false;
    _bc_sending = false;
    pendingEndRef.current = false;
    clearSilenceTimer();
    void stopRef.current();
    stopSpeaking();
    ttsSessionRef.current++;
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
    setJetztDu(false);
    micLiveRef.current = false;
  }, [clearSilenceTimer, sessionStart, sessionId, duration, onCallEnded, setJetztDu]);

  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  useEffect(() => {
    return () => {
      _bc_active = false;
      clearSilenceTimer();
      void stopRef.current();
      stopSpeaking();
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [clearSilenceTimer]);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    setMutedRef.current(next);
    if (next) {
      clearSilenceTimer();
      speechBufferRef.current = "";
      nonFinalRef.current = "";
      isSpeakingRef.current = false;
      speechFramesRef.current = 0;
      setLiveText("");
      setVolume(0);
    } else if (_bc_active && callStateRef.current === "listening") {
      void restartMicRef.current();
    }
    if (navigator.vibrate) navigator.vibrate(20);
  }, [clearSilenceTimer]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const canCall = contextReady && !limitReached;

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
            {isMuted && callState === "listening" ? "STUMM" : callState === "listening" && jetztDuActive ? "JETZT DU" : callState === "listening" ? "HOERT ZU" : callState === "thinking" ? "DENKT NACH" : "SPRICHT"}
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

          {showJetztDuNudge && jetztDuActive && callState === "listening" && !liveText && (
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

          {liveText && callState === "listening" && jetztDuActive && (
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
            const barHeight = isMuted
              ? 3
              : callState === "listening"
              ? Math.max(3, Math.min(18, (volume / 50) * 18 * Math.abs(Math.sin((i + 1) * 0.7))))
              : callState === "speaking"
              ? 5 + Math.abs(Math.sin(i * 0.8)) * 8
              : 3;
            return (
              <div key={i} style={{
                width: 3, borderRadius: 2, height: `${barHeight}px`,
                transition: callState === "speaking" || callState === "thinking" ? "none" : "height 0.1s",
                background: callState === "speaking"
                  ? `rgba(39,174,96,${0.4 + i * 0.06})`
                  : callState === "listening" && volume > SPEECH_THRESHOLD && !isMuted
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
