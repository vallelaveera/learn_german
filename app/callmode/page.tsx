"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useCallRecorder } from "@/components/CallRecorder";
import { FISH_SPOKEN_RULES } from "@/lib/fish-tts";
import { Message } from "@/lib/types";

// ── Module-level flags ─────────────────────────────────────
let _cm_sending = false;
let _cm_active = false;
let _cm_mic_start = 0;
let _cm_mic_running = false;
let _cm_tts_done_fired = false;

const SPEECH_THRESHOLD = 42; // sustained level = human speech (not chair/noise)
const SILENCE_THRESHOLD = 30; // below this = silence
const SPEECH_FRAMES_MIN = 12; // ~200ms sustained speech before accepting STT
const SILENCE_DURATION_ENDPOINT = 1200; // ms after Soniox endpoint
const SILENCE_DURATION_FALLBACK = 3000; // ms without endpoint
const INCOMPLETE_EXTRA_WAIT = 1200; // extra wait when text looks cut off
const MIC_WARMUP_MS = 1000; // wait before allowing silence detection
const TTS_CHUNK = 16384;

const AFFIRMATIVE_RE = /^(ja|genau|stimmt|richtig|fertig|doch)([\s,].*)?$/i;
const NEGATIVE_RE = /^(nein|nee|nö|nicht|noch nicht)([\s,].*)?$/i;
const YES_NO_WORDS = /^(ja|nein|nee|nö|okay|ok|doch|genau)$/i;

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const looksIncomplete = (text: string) => {
  const t = text.trim();
  if (!t) return true;
  if (/\s[a-zäöüßA-ZÄÖÜ]$/i.test(t)) return true;
  const last = t.split(/\s+/).pop() ?? "";
  if (last.length === 1 && !/[.!?]$/.test(t)) return true;
  return false;
};

const pickConfirmPhrase = (text: string) => {
  const lower = text.toLowerCase().replace(/[.!?,]/g, "").trim();
  if (YES_NO_WORDS.test(lower)) return "Bist du fertig?";
  if (lower.length <= 4) return Math.random() < 0.5 ? "Bist du fertig?" : "Meinst du das so?";
  return "Meinst du das so?";
};

const fallbackOpening = (name?: string) =>
  name
    ? `Hallo ${name}! Schön, dass du da bist. Wie geht's dir?`
    : "Hallo! Schön, dass du da bist. Wie geht's dir?";

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
    // Maya B (Fish) disabled in UI — always use Maya A until re-enabled
    ttsProviderRef.current = "soniox";
    localStorage.setItem("maya_voice", "soniox");
  }, []);

  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [cachedOpening, setCachedOpening] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicQuestionShown, setTopicQuestionShown] = useState(false);
  const [showSilenceHint, setShowSilenceHint] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const silenceHintRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());

  // Refs
  const speechBufferRef = useRef("");
  const isSpeakingRef = useRef(false);
  const speechFramesRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sttEndpointRef = useRef(false);
  const pendingShortReplyRef = useRef<string | null>(null);
  const awaitingConfirmRef = useRef(false);
  const tryCommitTurnRef = useRef<() => void>(() => {});
  const messagesRef = useRef<Message[]>([]);
  const systemPromptRef = useRef<string | undefined>();
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const finishTTSPlaybackRef = useRef<() => void>(() => {});
  const restartMicRef = useRef<() => Promise<void>>(async () => {});
  const streamTTSRef = useRef<((text: string) => Promise<void>) | null>(null);
  const endCallRef = useRef<() => void>(() => {});
  const router = useRouter();

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveText]);

  // Prefetch context + opening (never show green button until status is known)
  useEffect(() => {
    let limitHit = false;
    const timeout = setTimeout(() => {
      if (!limitHit) setContextReady(true);
    }, 8000);

    fetch("/api/context")
      .then(r => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then(data => {
        if (!data || data.error) return;
        if (data.limitReached) {
          limitHit = true;
          setLimitReached(true);
          if (data.user) setUser({ name: data.user.name });
          if (data.used !== undefined && data.limit !== undefined) {
            setUsage({ used: data.used, limit: data.limit, remaining: 0 });
          }
          return;
        }
        setUser({ name: data.user.name });
        systemPromptRef.current = data.systemPrompt;
        if (data.topics) setTopics(data.topics);
        if (data.usage) setUsage(data.usage);
        if (data.opening) {
          openingRef.current = data.opening;
          setCachedOpening(data.opening);
        }
      })
      .catch(console.error)
      .finally(() => {
        clearTimeout(timeout);
        setContextReady(true);
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
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = "";
    }
  }, []);

  const startRef = useRef<() => Promise<void>>(async () => {});
  const stopRef = useRef<() => void>(() => {});

  const restartMic = useCallback(async () => {
    if (!_cm_active || _cm_mic_running) return;
    _cm_mic_running = true;
    try {
      stopRef.current();
      await new Promise(r => setTimeout(r, 600));
      if (!_cm_active) return;
      speechBufferRef.current = "";
      isSpeakingRef.current = false;
      speechFramesRef.current = 0;
      setLiveText("");
      _cm_mic_start = Date.now();
      setCallState("listening");
      await startRef.current();
      if (isMutedRef.current) setMutedRef.current(true);
    } finally {
      _cm_mic_running = false;
    }
  }, []);

  const finishTTSPlayback = useCallback(() => {
    if (_cm_tts_done_fired || !_cm_active) return;
    _cm_tts_done_fired = true;
    _cm_sending = false;
    setTimeout(() => {
      if (_cm_active) restartMicRef.current();
    }, 400);
  }, []);

  const playChunk = useCallback(async (chunk: ArrayBuffer) => {
    const ctx = getAudioCtx();
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
          finishTTSPlaybackRef.current();
        }
      };
      sourceQueueRef.current.push(source);
    } catch (e) {
      console.error("playChunk error:", e);
    }
  }, []);

  // ── TTS ───────────────────────────────────────────────
  const streamTTS = useCallback(async (text: string) => {
    setCallState("speaking");
    stopAudio();
    nextStartRef.current = 0;
    _cm_tts_done_fired = false;
    if (!text.trim()) {
      finishTTSPlaybackRef.current();
      return;
    }
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider: ttsProviderRef.current }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();

      // Both voices — stream MP3 chunks so playback starts immediately (live call feel)
      let buf = new Uint8Array(0);
      let dispatched = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buf.length > 0) {
            dispatched = true;
            playChunk(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
          }
          break;
        }
        const nb = new Uint8Array(buf.length + value.length);
        nb.set(buf); nb.set(value, buf.length); buf = nb;
        if (buf.length >= TTS_CHUNK) {
          const tp = buf.slice(0, TTS_CHUNK); buf = buf.slice(TTS_CHUNK);
          dispatched = true;
          playChunk(tp.buffer.slice(tp.byteOffset, tp.byteOffset + tp.byteLength));
        }
      }
      if (!dispatched) finishTTSPlaybackRef.current();
    } catch (e) {
      console.error("TTS error:", e);
      finishTTSPlaybackRef.current();
    }
  }, [playChunk, stopAudio]);

  useEffect(() => { streamTTSRef.current = streamTTS; }, [streamTTS]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const speakLocal = useCallback(async (text: string, appendMsg: Message) => {
    const updated = [...messagesRef.current, appendMsg];
    setMessages(updated);
    messagesRef.current = updated;
    _cm_sending = true;
    setCallState("speaking");
    setLiveText("");
    await streamTTS(text);
  }, [streamTTS]);

  // ── Send to Claude ────────────────────────────────────
  const submitToClaude = useCallback(async (history: Message[]) => {
    _cm_sending = true;
    setCallState("thinking");
    setShowSilenceHint(false);
    if (silenceHintRef.current) { clearTimeout(silenceHintRef.current); silenceHintRef.current = null; }
    setLiveText("");

    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId, userId: "",
        startedAt: sessionStart, endedAt: Date.now(),
        messages: history,
        title: history.find(m => m.role === "user")?.content?.slice(0, 60) ?? "Gespraech",
        totalMessages: history.length,
      }),
    });

    try {
      const systemPrompt = ttsProviderRef.current === "fish"
        ? (systemPromptRef.current ?? "") + FISH_SPOKEN_RULES
        : systemPromptRef.current;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, systemPrompt }),
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
      const speechLines = allLines.filter(l => !l.startsWith("💡"));
      const german = speechLines.join(" ").trim();
      const hintLines = allLines
        .filter(l => l.startsWith("💡"))
        .map(l => l.replace(/^💡\s*/, "").trim())
        .filter(Boolean);
      const hint = hintLines.length
        ? hintLines.filter((h, i) => hintLines.indexOf(h) === i).join(" · ")
        : undefined;
      const assistantMsg: Message = {
        role: "assistant",
        content: german,
        translation: hint,
        timestamp: Date.now(),
      };
      const withAssistant = [...messagesRef.current, assistantMsg];
      setMessages(withAssistant);
      messagesRef.current = withAssistant;
      await streamTTS(german);
    } catch {
      _cm_sending = false;
      if (_cm_active) restartMicRef.current();
    }
  }, [streamTTS, sessionId, sessionStart]);

  const sendToTutor = useCallback(async (text: string) => {
    if (!text.trim() || _cm_sending) return;
    const userMsg: Message = { role: "user", content: text.replace(/<end>/g, "").trim(), timestamp: Date.now() };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;
    await submitToClaude(updated);
  }, [submitToClaude]);

  const askShortConfirm = useCallback(async (shortText: string) => {
    pendingShortReplyRef.current = shortText;
    awaitingConfirmRef.current = true;
    const userMsg: Message = { role: "user", content: shortText, timestamp: Date.now() };
    const phrase = pickConfirmPhrase(shortText);
    const confirmMsg: Message = { role: "assistant", content: phrase, timestamp: Date.now() };
    const updated = [...messagesRef.current, userMsg, confirmMsg];
    setMessages(updated);
    messagesRef.current = updated;
    _cm_sending = true;
    setCallState("speaking");
    setLiveText("");
    await streamTTS(phrase);
  }, [streamTTS]);

  const handleConfirmResponse = useCallback(async (text: string) => {
    const lower = text.toLowerCase().replace(/[.!?]/g, "").trim();
    pendingShortReplyRef.current = null;
    awaitingConfirmRef.current = false;

    if (AFFIRMATIVE_RE.test(lower)) {
      const confirmAnswer: Message = { role: "user", content: text, timestamp: Date.now() };
      const updated = [...messagesRef.current, confirmAnswer];
      setMessages(updated);
      messagesRef.current = updated;
      await submitToClaude(updated);
      return;
    }

    if (NEGATIVE_RE.test(lower)) {
      await speakLocal("Okay, erzähl weiter.", {
        role: "assistant",
        content: "Okay, erzähl weiter.",
        timestamp: Date.now(),
      });
      return;
    }

    if (wordCount(text) < 2) {
      await askShortConfirm(text);
      return;
    }

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;
    await submitToClaude(updated);
  }, [askShortConfirm, speakLocal, submitToClaude]);

  const tryCommitTurn = useCallback(() => {
    if (_cm_sending || !_cm_active) return;
    if (nonFinalRef.current.trim()) return;

    const text = speechBufferRef.current.trim();
    if (!text) return;

    if (looksIncomplete(text)) {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        tryCommitTurnRef.current();
      }, sttEndpointRef.current ? SILENCE_DURATION_ENDPOINT : INCOMPLETE_EXTRA_WAIT);
      return;
    }

    isSpeakingRef.current = false;
    speechFramesRef.current = 0;
    speechBufferRef.current = "";
    nonFinalRef.current = "";
    sttEndpointRef.current = false;
    clearSilenceTimer();
    stopRef.current();

    if (awaitingConfirmRef.current) {
      void handleConfirmResponse(text);
      return;
    }

    if (wordCount(text) < 2) {
      void askShortConfirm(text);
      return;
    }

    void sendToTutor(text);
  }, [askShortConfirm, clearSilenceTimer, handleConfirmResponse, sendToTutor]);

  useEffect(() => { tryCommitTurnRef.current = tryCommitTurn; }, [tryCommitTurn]);

  const scheduleSilenceSend = useCallback(() => {
    if (silenceTimerRef.current) return;
    const duration = sttEndpointRef.current ? SILENCE_DURATION_ENDPOINT : SILENCE_DURATION_FALLBACK;
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      tryCommitTurnRef.current();
    }, duration);
  }, []);

  // ── VAD — silence detection (hysteresis + sustained speech gate) ──
  const handleVolume = useCallback((vol: number) => {
    if (isMutedRef.current) {
      setVolume(0);
      return;
    }
    setVolume(vol);
    if (!_cm_active || _cm_sending) return;
    if (Date.now() - _cm_mic_start < MIC_WARMUP_MS) return;

    if (vol >= SPEECH_THRESHOLD) {
      speechFramesRef.current++;
      if (speechFramesRef.current >= SPEECH_FRAMES_MIN) {
        isSpeakingRef.current = true;
      }
      sttEndpointRef.current = false;
    } else if (vol < SILENCE_THRESHOLD) {
      speechFramesRef.current = 0;
    }

    const speaking = isSpeakingRef.current;

    if (!speaking) {
      setShowSilenceHint(false);
      if (silenceHintRef.current) {
        clearTimeout(silenceHintRef.current);
        silenceHintRef.current = null;
      }
      clearSilenceTimer();
      return;
    }

    setShowSilenceHint(false);
    if (silenceHintRef.current) {
      clearTimeout(silenceHintRef.current);
      silenceHintRef.current = null;
    }

    if (vol >= SILENCE_THRESHOLD) {
      clearSilenceTimer();
    } else if (speechBufferRef.current.trim() && !nonFinalRef.current.trim()) {
      scheduleSilenceSend();
    }
  }, [clearSilenceTimer, scheduleSilenceSend]);

  // ── Transcript callbacks ──────────────────────────────
  const nonFinalRef = useRef("");

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isMutedRef.current || !isSpeakingRef.current) return;
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
    if (!_cm_active || _cm_sending || isMutedRef.current) return;
    sttEndpointRef.current = true;
    if (speechBufferRef.current.trim() && isSpeakingRef.current) {
      clearSilenceTimer();
      scheduleSilenceSend();
    }
  }, [clearSilenceTimer, scheduleSilenceSend]);

  // Pass last Maya message as context to Soniox for better accuracy
  const getContext = useCallback(() => {
    const lastMaya = [...messagesRef.current].reverse().find(m => m.role === "assistant");
    return lastMaya?.content ?? "";
  }, []);

  const handleRecorderError = useCallback((e: string) => {
    if (e.includes("429")) {
      setError("Zu viele Verbindungen. Bitte warte einen Moment und versuche es erneut.");
      endCallRef.current();
      return;
    }
    setError(e);
  }, []);

  const setMutedRef = useRef<(muted: boolean) => void>(() => {});

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
      sttEndpointRef.current = false;
      setLiveText("");
      setVolume(0);
    } else {
      _cm_mic_start = Date.now();
    }
    if (navigator.vibrate) navigator.vibrate(20);
  }, [clearSilenceTimer]);

  const { start, stop, setMuted, audioCtxRef: recorderAudioCtxRef } = useCallRecorder({
    apiKey: process.env.NEXT_PUBLIC_SONIOX_API_KEY ?? "",
    onTranscript: handleTranscript,
    onFinished: handleFinished,
    onError: handleRecorderError,
    onVolume: handleVolume,
    getContext,
  });

  // Keep refs in sync
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { stopRef.current = stop; }, [stop]);
  useEffect(() => { setMutedRef.current = setMuted; }, [setMuted]);
  useEffect(() => { restartMicRef.current = restartMic; }, [restartMic]);
  useEffect(() => { finishTTSPlaybackRef.current = finishTTSPlayback; }, [finishTTSPlayback]);

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
    _cm_sending = true;
    speechBufferRef.current = "";
    isSpeakingRef.current = false;
    speechFramesRef.current = 0;
    sttEndpointRef.current = false;
    pendingShortReplyRef.current = null;
    awaitingConfirmRef.current = false;
    isMutedRef.current = false;
    setIsMuted(false);
    setError(null);
    setLiveText("");
    setDuration(0);

    try {
      if ("wakeLock" in navigator) await (navigator as any).wakeLock.request("screen");
    } catch {}

    durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    setPhase("active");

    let opening = openingRef.current ?? cachedOpening;
    if (!opening) {
      try {
        const r = await fetch("/api/context");
        const data = await r.json();
        if (data?.opening) {
          opening = data.opening;
          openingRef.current = data.opening;
          setCachedOpening(data.opening);
        }
        if (data?.systemPrompt) systemPromptRef.current = data.systemPrompt;
      } catch {}
    }
    if (!opening) opening = fallbackOpening(user?.name);

    const msg: Message = { role: "assistant", content: opening, timestamp: Date.now() };
    setMessages([msg]);
    messagesRef.current = [msg];
    setCallState("speaking");

    await streamTTSRef.current?.(opening);
  };

  // ── End call ──────────────────────────────────────────
  const endCall = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    _cm_active = false;
    _cm_sending = false;
    _cm_mic_running = false;
    _cm_tts_done_fired = true;
    sttEndpointRef.current = false;
    pendingShortReplyRef.current = null;
    awaitingConfirmRef.current = false;
    isMutedRef.current = false;
    setIsMuted(false);
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

  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

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

  const canCall = contextReady && !limitReached;

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
      <p style={{ fontSize: 12, color: "#8a7060", marginBottom: 16, textAlign: "center", lineHeight: 1.7, maxWidth: 280 }}>
        Sprich einfach — Maya hört automatisch zu und antwortet wenn du fertig bist
      </p>

      {contextReady && limitReached && (
        <div style={{ textAlign: "center", marginBottom: 24, padding: "12px 16px", maxWidth: 300, background: "rgba(192,57,43,0.08)", border: "0.5px solid rgba(192,57,43,0.25)", borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 4 }}>Monatslimit erreicht</p>
          <p style={{ fontSize: 12, color: "#8a7060", lineHeight: 1.5 }}>
            {usage ? `${usage.used} / ${usage.limit} Minuten genutzt` : "Keine Minuten mehr diesen Monat"}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32, marginTop: contextReady && limitReached ? 0 : 8 }}>
        <div style={{ position: "relative", width: 80, height: 80 }}>
          {canCall && (
            <>
              <div
                aria-hidden
                style={{
                  position: "absolute", inset: -10, borderRadius: "50%",
                  border: "2px solid rgba(39,174,96,0.45)",
                  animation: "pulse-ring 1.8s ease-out infinite",
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute", inset: -10, borderRadius: "50%",
                  border: "2px solid rgba(39,174,96,0.45)",
                  animation: "pulse-ring 1.8s ease-out 0.9s infinite",
                }}
              />
            </>
          )}
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
            onClick={startCall}
            disabled={!canCall}
            aria-label={canCall ? "Anruf annehmen" : limitReached ? "Monatslimit erreicht" : "Maya bereitet sich vor"}
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
              animation: canCall ? "fade-in 0.4s ease-out" : undefined,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill={canCall ? "white" : limitReached ? "rgba(255,255,255,0.3)" : "var(--accent)"}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
        {canCall && (
          <p style={{
            marginTop: 20, fontSize: 13, color: "var(--green)", fontWeight: 500,
            fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
            animation: "fade-in 0.5s ease-out",
          }}>
            ↑ Anruf annehmen
          </p>
        )}
      </div>

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
            {msg.translation && msg.role === "assistant" && (
              <p style={{ fontSize: 11, color: "#7c4daa", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>💡 {msg.translation}</p>
            )}
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
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isMuted && callState === "listening" ? "var(--border)" : callState === "speaking" ? "var(--green)" : callState === "listening" ? "var(--accent)" : "var(--border)", boxShadow: isMuted && callState === "listening" ? "none" : callState === "speaking" ? "0 0 6px rgba(39,174,96,0.6)" : callState === "listening" ? "0 0 6px rgba(212,168,67,0.6)" : "none", transition: "all 0.3s" }} />
          <span style={{ fontSize: 11, color: "#8a7060", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
            {isMuted && callState === "listening" ? "STUMM" : callState === "listening" ? "HOERT ZU" : callState === "thinking" ? "DENKT NACH" : "SPRICHT"}
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
              {msg.translation && msg.role === "assistant" && (
                <p style={{ fontSize: 11, color: "#7c4daa", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>💡 {msg.translation}</p>
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
            const height = isMuted
              ? 4
              : callState === "listening"
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
                  : callState === "listening" && volume > SPEECH_THRESHOLD
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

        {/* Mute + hang up */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36 }}>
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Mikrofon einschalten" : "Mikrofon stummschalten"}
            aria-pressed={isMuted}
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: isMuted ? "rgba(192,57,43,0.12)" : "var(--surface)",
              border: `2px solid ${isMuted ? "rgba(192,57,43,0.45)" : "var(--accent-dim)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
            }}
          >
            {isMuted ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          <button
            onClick={endCall}
            aria-label="Anruf beenden"
            style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(192,57,43,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", boxShadow: "0 4px 20px rgba(192,57,43,0.3)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
        {isMuted && callState === "listening" && (
          <p style={{ fontSize: 11, color: "#8a7060", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginTop: -8 }}>Mikrofon stumm</p>
        )}
      </div>
    </div>
  );
}
