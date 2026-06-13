"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useCallRecorder } from "@/components/CallRecorder";
import { CallPreCallSetup } from "@/components/call/CallPreCallSetup";
import { CallGrammarProgressHud, CallGrammarTurnBadge } from "@/components/call/CallGrammarProgress";
import { FISH_SPOKEN_RULES, prepareFishTTS } from "@/lib/fish-tts";
import { computeCallReportStats } from "@/lib/call-report-stats";
import { loadCallSettings, type CallSettings } from "@/lib/call-settings";
import { parseTutorResponse, attachCorrectionToLastUser, markLastUserGrammarCorrect } from "@/lib/tutor-response";
import {
  buildOnboardingIntroEnglish,
  userWantsEnglishIntro,
} from "@/lib/memory-agent";
import { Message } from "@/lib/types";
import { isFarewellUtterance, buildGoodbyePromptSuffix } from "@/lib/call-farewell";
import { useCallUsageBilling } from "@/components/billing/useCallUsageBilling";
import { buildCallContextUrl } from "@/lib/grammar/context-url";
import {
  isBrowserOffline,
  isLikelyNetworkError,
  isLikelyNetworkMessage,
  probeCallConnectivity,
} from "@/lib/call-network";
import { playCallNetworkMessage, prefetchCallNetworkMessage } from "@/lib/call-network-audio";

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
const COLLAPSE_AFTER_USER_TURNS = 5;
const KEEP_BROWSER_ACTIVE_TEXT =
  "Bitte lass den Browser aktiv. Please keep the browser active.";
const TAB_REMINDER_COOLDOWN_MS = 25000;
const MANUAL_SEND_VISIBLE_AFTER_MS = 2_000; // show manual send after ~2 s of live text
const VOLUME_UI_INTERVAL_MS = 250;

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

async function ensureMicPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

type Phase = "idle" | "active";
type CallState = "listening" | "thinking" | "speaking";

export interface FreisprechenCallProps {
  onCallEnded?: (messages: Message[], durationSec: number) => void;
  embedded?: boolean;
  scenarioId?: string | null;
  grammarId?: string | null;
}

export function FreisprechenCall({ onCallEnded, embedded, scenarioId, grammarId }: FreisprechenCallProps = {}) {
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
    ttsProviderRef.current = "soniox";
  }, []);

  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [cachedOpening, setCachedOpening] = useState<string | null>(null);
  const [pendingHomework, setPendingHomework] = useState<{ id: string; progress?: { completedReps: number; totalReps: number } } | null>(null);
  const pendingHomeworkRepsRef = useRef(0);
  const userWantsEndRef = useRef(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicQuestionShown, setTopicQuestionShown] = useState(false);
  const [showJetztDuNudge, setShowJetztDuNudge] = useState(false);
  const [showMayaReplyNudge, setShowMayaReplyNudge] = useState(false);
  const [showManualSend, setShowManualSend] = useState(false);
  const [jetztDuActive, setJetztDuActive] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [tabInactiveWarning, setTabInactiveWarning] = useState(false);
  const [networkIssue, setNetworkIssue] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const isMutedRef = useRef(false);
  const tabLeftRef = useRef(false);
  const lastTabReminderRef = useRef(0);
  const tabReminderPlayingRef = useRef(false);
  const [sessionId] = useState(() => uuidv4());
  const [sessionStart] = useState(() => Date.now());
  const endCallRef = useRef<() => void>(() => {});

  useCallUsageBilling({
    sessionId,
    sessionStart,
    active: phase === "active",
    onLimitReached: () => {
      setLimitReached(true);
      endCallRef.current();
    },
    onUsageUpdate: setUsage,
  });

  // Refs
  const speechBufferRef = useRef("");
  const nonFinalRef = useRef("");
  const isSpeakingRef = useRef(false);
  const speechFramesRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sttEndpointRef = useRef(false);
  const sttTimedOutWhileMutedRef = useRef(false);
  const networkAlertAtRef = useRef(0);
  const announceNetworkIssueRef = useRef<() => void>(() => {});
  const NETWORK_ALERT_COOLDOWN_MS = 45000;
  const pendingShortReplyRef = useRef<string | null>(null);
  const awaitingConfirmRef = useRef(false);
  const tryCommitTurnRef = useRef<(force?: boolean) => void>(() => {});
  const messagesRef = useRef<Message[]>([]);
  const systemPromptRef = useRef<string | undefined>();
  const isOnboardingRef = useRef(false);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef<string | null>(null);
  const openingFollowUpRef = useRef<string | null>(null);
  const normalOpeningRef = useRef<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const finishTTSPlaybackRef = useRef<() => void>(() => {});
  const restartMicRef = useRef<() => Promise<void>>(async () => {});
  const callStateRef = useRef<CallState>("listening");
  const lastVolumeUiAtRef = useRef(0);
  const liveTextSinceRef = useRef<number | null>(null);
  const streamTTSRef = useRef<((text: string) => Promise<void>) | null>(null);
  const lastTtsTextRef = useRef("");
  const jetztDuRef = useRef(false);
  const router = useRouter();

  const setJetztDu = useCallback((active: boolean) => {
    jetztDuRef.current = active;
    setJetztDuActive(active);
    if (active) {
      setShowJetztDuNudge(true);
      setShowMayaReplyNudge(false);
    } else {
      setShowJetztDuNudge(false);
    }
  }, []);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const { visibleMessages, hiddenMessageCount } = useMemo(() => {
    const indexed = messages.map((msg, messageIndex) => ({ msg, messageIndex }));
    const userIndices = messages
      .map((m, i) => (m.role === "user" ? i : -1))
      .filter(i => i >= 0);
    if (historyExpanded || userIndices.length <= COLLAPSE_AFTER_USER_TURNS) {
      return { visibleMessages: indexed, hiddenMessageCount: 0 };
    }
    const cutIndex = userIndices[userIndices.length - COLLAPSE_AFTER_USER_TURNS];
    return {
      visibleMessages: indexed.slice(cutIndex),
      hiddenMessageCount: cutIndex,
    };
  }, [messages, historyExpanded]);

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

    const contextUrl = buildCallContextUrl({ scenarioId, grammarId });

    fetch(contextUrl)
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
        isOnboardingRef.current = !!data.isOnboarding;
        if (data.topics) setTopics(data.topics);
        if (data.usage) setUsage(data.usage);
        if (data.opening) {
          openingRef.current = data.opening;
          setCachedOpening(data.opening);
        }
        if (data.openingFollowUp) {
          openingFollowUpRef.current = data.openingFollowUp;
        }
        if (data.normalOpening) {
          normalOpeningRef.current = data.normalOpening;
        }
        if (data.pendingHomework) {
          setPendingHomework(data.pendingHomework);
        }
        if (data.homeworkSummary?.remainingReps != null) {
          pendingHomeworkRepsRef.current = data.homeworkSummary.remainingReps;
        }
      })
      .catch(console.error)
      .finally(() => {
        clearTimeout(timeout);
        setContextReady(true);
      });
  }, [router, scenarioId, grammarId]);

  // ── Audio playback ─────────────────────────────────────
  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const playCallAnnouncement = useCallback(async (text: string) => {
    if (!_cm_active || tabReminderPlayingRef.current || !text.trim()) return;
    tabReminderPlayingRef.current = true;
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider: ttsProviderRef.current }),
      });
      if (!res.ok || !res.body) throw new Error("TTS failed");
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.length) chunks.push(value);
      }
      if (!chunks.length) return;
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const decoded = await ctx.decodeAudioData(
        merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength),
      );
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      await new Promise<void>(resolve => {
        source.onended = () => resolve();
        source.start();
      });
    } catch {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        await new Promise<void>(resolve => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "en-US";
          utterance.rate = 0.95;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }
    } finally {
      tabReminderPlayingRef.current = false;
    }
  }, []);

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
  const stopRef = useRef<() => Promise<Blob | null>>(async () => null);
  const callSettingsRef = useRef<CallSettings>(loadCallSettings());
  const prewarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micPrewarmedRef = useRef(false);
  const micLiveRef = useRef(false);
  const setTranscriptPausedRef = useRef<(paused: boolean) => void>(() => {});
  const prewarmMicRef = useRef<() => Promise<void>>(async () => {});
  const activateMicAfterTTSRef = useRef<() => Promise<void>>(async () => {});

  const clearPrewarmTimer = useCallback(() => {
    if (prewarmTimerRef.current) {
      clearTimeout(prewarmTimerRef.current);
      prewarmTimerRef.current = null;
    }
  }, []);

  const schedulePrewarmMic = useCallback(() => {
    clearPrewarmTimer();
    const ctx = audioCtxRef.current;
    if (!ctx || !_cm_active || !_cm_sending || micLiveRef.current) return;
    const msUntilEnd = Math.max(0, (nextStartRef.current - ctx.currentTime) * 1000);
    const delay = Math.max(0, msUntilEnd - callSettingsRef.current.earlyMicMs);
    prewarmTimerRef.current = setTimeout(() => {
      prewarmTimerRef.current = null;
      if (_cm_active && _cm_sending && !micLiveRef.current) void prewarmMicRef.current();
    }, delay);
  }, [clearPrewarmTimer]);

  const prewarmMic = useCallback(async () => {
    if (!_cm_active || !_cm_sending || _cm_mic_running || micLiveRef.current) return;
    _cm_mic_running = true;
    setTranscriptPausedRef.current(true);
    try {
      await startRef.current();
      micPrewarmedRef.current = true;
      micLiveRef.current = true;
    } catch {
      micPrewarmedRef.current = false;
      micLiveRef.current = false;
    } finally {
      _cm_mic_running = false;
    }
  }, []);

  const activateMicAfterTTS = useCallback(async () => {
    if (!_cm_active) return;
    clearPrewarmTimer();
    const pauseMs = callSettingsRef.current.pauseBetweenTurnsMs;
    await new Promise(resolve => setTimeout(resolve, pauseMs));
    if (!_cm_active) return;

    if (micPrewarmedRef.current && micLiveRef.current) {
      _cm_sending = false;
      micPrewarmedRef.current = false;
      speechBufferRef.current = "";
      nonFinalRef.current = "";
      isSpeakingRef.current = false;
      speechFramesRef.current = 0;
      sttEndpointRef.current = false;
      _cm_mic_start = Date.now();
      setTranscriptPausedRef.current(false);
      setJetztDu(true);
      setLiveText("");
      setCallState("listening");
      return;
    }

    _cm_sending = false;
    await restartMicRef.current();
  }, [clearPrewarmTimer, setJetztDu]);

  const restartMic = useCallback(async () => {
    if (!_cm_active || _cm_mic_running) return;
    _cm_mic_running = true;
    try {
      await stopRef.current();
      micLiveRef.current = false;
      micPrewarmedRef.current = false;
      if (!_cm_active) return;
      speechBufferRef.current = "";
      isSpeakingRef.current = false;
      speechFramesRef.current = 0;
      nonFinalRef.current = "";
      sttEndpointRef.current = false;
      setLiveText("");
      _cm_mic_start = Date.now();
      setTranscriptPausedRef.current(false);
      setJetztDu(true);
      setCallState("listening");
      await startRef.current();
      micLiveRef.current = true;
      if (isMutedRef.current) setMutedRef.current(true);
    } finally {
      _cm_mic_running = false;
    }
  }, [setJetztDu]);

  const announceNetworkIssue = useCallback(async () => {
    if (!_cm_active) return;
    const now = Date.now();
    if (now - networkAlertAtRef.current < NETWORK_ALERT_COOLDOWN_MS) return;

    const offline = isBrowserOffline();
    if (!offline) {
      const reachable = await probeCallConnectivity();
      if (reachable) return;
    }

    networkAlertAtRef.current = now;
    setNetworkIssue("Verbindungsproblem — bitte Internet prüfen · Check your connection");
    setError(null);
    setTtsError(null);
    _cm_sending = false;
    stopAudio();
    setCallState("speaking");
    try {
      await playCallNetworkMessage(getAudioCtx);
    } catch {
      /* banner still visible */
    }
    if (!_cm_active) return;
    setCallState("listening");
    if (micLiveRef.current) void restartMicRef.current();
  }, [stopAudio]);

  useEffect(() => { announceNetworkIssueRef.current = () => { void announceNetworkIssue(); }; }, [announceNetworkIssue]);

  const finishTTSPlayback = useCallback(() => {
    if (_cm_tts_done_fired || !_cm_active) return;
    _cm_tts_done_fired = true;
    if (userWantsEndRef.current) {
      userWantsEndRef.current = false;
      _cm_sending = false;
      setTimeout(() => endCallRef.current(), 400);
      return;
    }
    void activateMicAfterTTSRef.current();
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
      schedulePrewarmMic();
    } catch (e) {
      console.error("playChunk error:", e);
    }
  }, [getAudioCtx, schedulePrewarmMic]);

  // ── TTS ───────────────────────────────────────────────
  const streamTTS = useCallback(async (text: string) => {
    setShowMayaReplyNudge(false);
    setCallState("speaking");
    setJetztDu(false);
    setTtsError(null);
    setTranscriptPausedRef.current(true);
    speechBufferRef.current = "";
    nonFinalRef.current = "";
    setLiveText("");
    lastTtsTextRef.current = text;
    speechBufferRef.current = "";
    nonFinalRef.current = "";
    stopAudio();
    clearPrewarmTimer();
    nextStartRef.current = 0;
    _cm_tts_done_fired = false;
    _cm_sending = true;
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
      if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);
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
      if (isLikelyNetworkError(e)) {
        void announceNetworkIssue();
      } else {
        setTtsError("Maya konnte nicht sprechen — Verbindung prüfen.");
        _cm_sending = true;
        setCallState("speaking");
      }
    }
  }, [playChunk, stopAudio, clearPrewarmTimer, setJetztDu, announceNetworkIssue]);

  const retryTTS = useCallback(() => {
    if (!lastTtsTextRef.current.trim()) return;
    void streamTTS(lastTtsTextRef.current);
  }, [streamTTS]);

  useEffect(() => { streamTTSRef.current = streamTTS; }, [streamTTS]);

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  useEffect(() => {
    if (!liveText.trim() || callState !== "listening" || !jetztDuActive || isMuted) {
      liveTextSinceRef.current = null;
      setShowManualSend(false);
      return;
    }
    if (!liveTextSinceRef.current) {
      liveTextSinceRef.current = Date.now();
    }
    const elapsed = Date.now() - liveTextSinceRef.current;
    if (elapsed >= MANUAL_SEND_VISIBLE_AFTER_MS) {
      setShowManualSend(true);
      return;
    }
    const timer = setTimeout(() => setShowManualSend(true), MANUAL_SEND_VISIBLE_AFTER_MS - elapsed);
    return () => clearTimeout(timer);
  }, [liveText, callState, jetztDuActive, isMuted]);

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
    setJetztDu(false);
    setCallState("speaking");
    setLiveText("");
    await streamTTS(text);
  }, [streamTTS, setJetztDu]);

  // ── Send to Claude ────────────────────────────────────
  const submitToClaude = useCallback(async (history: Message[]) => {
    _cm_sending = true;
    setJetztDu(false);
    setCallState("thinking");
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
        newWords: computeCallReportStats(history, Math.max(0, Math.round((Date.now() - sessionStart) / 1000))).newWords,
      }),
    });

    try {
      let prompt = systemPromptRef.current ?? "";
      if (ttsProviderRef.current === "fish") {
        prompt += FISH_SPOKEN_RULES;
      }
      const lastUser = [...history].reverse().find(m => m.role === "user");
      if (lastUser && isFarewellUtterance(lastUser.content)) {
        userWantsEndRef.current = true;
        prompt += buildGoodbyePromptSuffix(pendingHomeworkRepsRef.current);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, systemPrompt: prompt }),
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
      const parsed = parseTutorResponse(fullText);
      const german = ttsProviderRef.current === "fish"
        ? prepareFishTTS(parsed.german)
        : parsed.german;

      let withCorrection = messagesRef.current;
      if (parsed.correction) {
        withCorrection = attachCorrectionToLastUser(withCorrection, parsed.correction);
      } else {
        withCorrection = markLastUserGrammarCorrect(withCorrection);
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: german,
        translation: parsed.hint,
        timestamp: Date.now(),
      };
      const withAssistant = [...withCorrection, assistantMsg];
      setMessages(withAssistant);
      messagesRef.current = withAssistant;
      await streamTTS(german);
    } catch (err) {
      _cm_sending = false;
      if (isLikelyNetworkError(err) || isBrowserOffline()) {
        void announceNetworkIssue();
      } else if (_cm_active) {
        restartMicRef.current();
      }
    }
  }, [streamTTS, sessionId, sessionStart, setJetztDu, announceNetworkIssue]);

  const sendToTutor = useCallback(async (text: string, audioBlob?: Blob | null) => {
    if (!text.trim() || _cm_sending) return;
    setShowJetztDuNudge(false);
    setShowMayaReplyNudge(true);
    setLiveText("");
    const userMsg: Message = {
      role: "user",
      content: text.replace(/<end>/g, "").trim(),
      timestamp: Date.now(),
      ...(audioBlob ? { audioUrl: URL.createObjectURL(audioBlob) } : {}),
    };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;

    const isFirstOnboardingReply =
      isOnboardingRef.current
      && updated.filter(m => m.role === "user").length === 1
      && updated.filter(m => m.role === "assistant").length >= 2;

    if (isFirstOnboardingReply && userWantsEnglishIntro(text)) {
      const englishIntro = buildOnboardingIntroEnglish(user?.name ?? "du");
      const reply = `${englishIntro} Okay — let's begin. Bist du Student oder berufstätig?`;
      await speakLocal(reply, {
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      });
      return;
    }

    await submitToClaude(updated);
  }, [submitToClaude, speakLocal, user?.name]);

  const askShortConfirm = useCallback(async (shortText: string, audioBlob?: Blob | null) => {
    pendingShortReplyRef.current = shortText;
    awaitingConfirmRef.current = true;
    const userMsg: Message = {
      role: "user",
      content: shortText,
      timestamp: Date.now(),
      ...(audioBlob ? { audioUrl: URL.createObjectURL(audioBlob) } : {}),
    };
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

  const handleConfirmResponse = useCallback(async (text: string, audioBlob?: Blob | null) => {
    const lower = text.toLowerCase().replace(/[.!?]/g, "").trim();
    pendingShortReplyRef.current = null;
    awaitingConfirmRef.current = false;

    if (AFFIRMATIVE_RE.test(lower)) {
      setShowMayaReplyNudge(true);
      setLiveText("");
      const confirmAnswer: Message = {
        role: "user",
        content: text,
        timestamp: Date.now(),
        ...(audioBlob ? { audioUrl: URL.createObjectURL(audioBlob) } : {}),
      };
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

    if (wordCount(text) < 2 && !isFarewellUtterance(text)) {
      await askShortConfirm(text, audioBlob);
      return;
    }

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: Date.now(),
      ...(audioBlob ? { audioUrl: URL.createObjectURL(audioBlob) } : {}),
    };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;
    await submitToClaude(updated);
  }, [askShortConfirm, speakLocal, submitToClaude]);

  const tryCommitTurn = useCallback(async (force = false) => {
    if (_cm_sending || !_cm_active) return;

    if (nonFinalRef.current.trim()) {
      speechBufferRef.current += nonFinalRef.current;
      nonFinalRef.current = "";
    }

    const text = speechBufferRef.current.trim();
    if (!text) return;

    if (!force && looksIncomplete(text)) {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        void tryCommitTurnRef.current();
      }, sttEndpointRef.current ? SILENCE_DURATION_ENDPOINT : INCOMPLETE_EXTRA_WAIT);
      return;
    }

    isSpeakingRef.current = false;
    speechFramesRef.current = 0;
    speechBufferRef.current = "";
    nonFinalRef.current = "";
    sttEndpointRef.current = false;
    clearSilenceTimer();
    const audioBlob = await stopRef.current();
    micLiveRef.current = false;
    micPrewarmedRef.current = false;

    if (awaitingConfirmRef.current) {
      void handleConfirmResponse(text, audioBlob);
      return;
    }

    if (wordCount(text) < 2 && !isFarewellUtterance(text)) {
      void askShortConfirm(text, audioBlob);
      return;
    }

    void sendToTutor(text, audioBlob);
  }, [askShortConfirm, clearSilenceTimer, handleConfirmResponse, sendToTutor]);

  useEffect(() => { tryCommitTurnRef.current = (force?: boolean) => { void tryCommitTurn(force); }; }, [tryCommitTurn]);

  const forceSendTurn = useCallback(() => {
    if (_cm_sending || !_cm_active || isMutedRef.current || !jetztDuRef.current) return;
    if (!speechBufferRef.current.trim() && !nonFinalRef.current.trim() && !liveText.trim()) return;
    clearSilenceTimer();
    isSpeakingRef.current = false;
    speechFramesRef.current = 0;
    sttEndpointRef.current = true;
    void tryCommitTurn(true);
  }, [clearSilenceTimer, tryCommitTurn, liveText]);

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
      if (lastVolumeUiAtRef.current !== 0) {
        lastVolumeUiAtRef.current = 0;
        setVolume(0);
      }
      return;
    }
    const uiState = callStateRef.current;
    if (uiState === "listening") {
      const now = Date.now();
      if (now - lastVolumeUiAtRef.current >= VOLUME_UI_INTERVAL_MS) {
        lastVolumeUiAtRef.current = now;
        setVolume(vol);
      }
    }
    if (!_cm_active || _cm_sending) return;
    if (Date.now() - _cm_mic_start < MIC_WARMUP_MS) return;

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

    const speaking = isSpeakingRef.current;

    if (!speaking) {
      clearSilenceTimer();
      return;
    }

    if (vol >= SILENCE_THRESHOLD) {
      clearSilenceTimer();
    } else if (speechBufferRef.current.trim() && !nonFinalRef.current.trim()) {
      scheduleSilenceSend();
    }
  }, [clearSilenceTimer, scheduleSilenceSend]);

  // ── Transcript callbacks ──────────────────────────────

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isMutedRef.current) return;
    if (!jetztDuRef.current) return;

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
    if (!_cm_active || _cm_sending || isMutedRef.current || !jetztDuRef.current) return;
    sttEndpointRef.current = true;
    if (speechBufferRef.current.trim()) {
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
    if (e.includes("408") && isMutedRef.current) {
      sttTimedOutWhileMutedRef.current = true;
      return;
    }
    if (isLikelyNetworkMessage(e)) {
      announceNetworkIssueRef.current();
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
      if (sttTimedOutWhileMutedRef.current && micLiveRef.current && !_cm_sending) {
        sttTimedOutWhileMutedRef.current = false;
        void restartMicRef.current();
      }
    }
    if (navigator.vibrate) navigator.vibrate(20);
  }, [clearSilenceTimer]);

  const { start, stop, setMuted, setTranscriptPaused, audioCtxRef: recorderAudioCtxRef } = useCallRecorder({
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
  useEffect(() => { setTranscriptPausedRef.current = setTranscriptPaused; }, [setTranscriptPaused]);
  useEffect(() => { restartMicRef.current = restartMic; }, [restartMic]);
  useEffect(() => { prewarmMicRef.current = prewarmMic; }, [prewarmMic]);
  useEffect(() => { activateMicAfterTTSRef.current = activateMicAfterTTS; }, [activateMicAfterTTS]);
  useEffect(() => { finishTTSPlaybackRef.current = finishTTSPlayback; }, [finishTTSPlayback]);

  useEffect(() => {
    if (phase !== "active") return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        tabLeftRef.current = true;
        setTabInactiveWarning(true);
        return;
      }

      setTabInactiveWarning(false);
      void getAudioCtx().resume();
      if (recorderAudioCtxRef.current?.state === "suspended") {
        void recorderAudioCtxRef.current.resume();
      }

      if (
        tabLeftRef.current &&
        Date.now() - lastTabReminderRef.current >= TAB_REMINDER_COOLDOWN_MS
      ) {
        tabLeftRef.current = false;
        lastTabReminderRef.current = Date.now();
        void playCallAnnouncement(KEEP_BROWSER_ACTIVE_TEXT);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [phase, playCallAnnouncement]);

  useEffect(() => {
    if (phase !== "active") return;

    const onOffline = () => { announceNetworkIssueRef.current(); };
    const onOnline = () => {
      setNetworkIssue(null);
      networkAlertAtRef.current = 0;
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [phase]);

  // ── Start call ────────────────────────────────────────
  const startCall = async (skipNag = false) => {
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
    userWantsEndRef.current = false;
    isMutedRef.current = false;
    setIsMuted(false);
    setError(null);
    setTtsError(null);
    setJetztDu(false);
    setLiveText("");
    setDuration(0);
    setTabInactiveWarning(false);
    tabLeftRef.current = false;
    setNetworkIssue(null);
    networkAlertAtRef.current = 0;
    setShowManualSend(false);
    liveTextSinceRef.current = null;
    setHistoryExpanded(false);
    void prefetchCallNetworkMessage(ttsProviderRef.current);

    try {
      if ("wakeLock" in navigator) await (navigator as any).wakeLock.request("screen");
    } catch {}

    durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    setPhase("active");

    const micOk = await ensureMicPermission();
    if (!micOk) {
      _cm_active = false;
      _cm_sending = false;
      setPhase("idle");
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
      setError("Mikrofon-Zugriff nötig — bitte erlauben und erneut starten.");
      return;
    }

    lastTabReminderRef.current = Date.now();
    await playCallAnnouncement(KEEP_BROWSER_ACTIVE_TEXT);

    let opening = skipNag
      ? (normalOpeningRef.current ?? openingRef.current ?? cachedOpening)
      : (openingRef.current ?? cachedOpening);
    if (!opening) {
      try {
        const r = await fetch(buildCallContextUrl({ scenarioId, grammarId }));
        const data = await r.json();
        if (data?.opening) {
          openingRef.current = data.opening;
          setCachedOpening(data.opening);
          if (skipNag && data.normalOpening) opening = data.normalOpening;
          else opening = data.opening;
        }
        if (data?.openingFollowUp) {
          openingFollowUpRef.current = data.openingFollowUp;
        }
        if (data?.normalOpening) normalOpeningRef.current = data.normalOpening;
        if (data?.systemPrompt) systemPromptRef.current = data.systemPrompt;
      } catch {}
    }
    if (!opening) opening = fallbackOpening(user?.name);

    const msg: Message = { role: "assistant", content: opening, timestamp: Date.now() };
    setMessages([msg]);
    messagesRef.current = [msg];
    setCallState("speaking");

    await streamTTSRef.current?.(opening);

    const followUp = openingFollowUpRef.current;
    if (followUp && isOnboardingRef.current) {
      await speakLocal(followUp, {
        role: "assistant",
        content: followUp,
        timestamp: Date.now() + 1,
      });
    }
  };

  // ── End call ──────────────────────────────────────────
  const endCall = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    _cm_active = false;
    _cm_sending = false;
    _cm_mic_running = false;
    _cm_tts_done_fired = true;
    clearPrewarmTimer();
    sttEndpointRef.current = false;
    pendingShortReplyRef.current = null;
    awaitingConfirmRef.current = false;
    userWantsEndRef.current = false;
    micLiveRef.current = false;
    micPrewarmedRef.current = false;
    isMutedRef.current = false;
    setJetztDu(false);
    setIsMuted(false);
    setTabInactiveWarning(false);
    tabLeftRef.current = false;
    setNetworkIssue(null);
    networkAlertAtRef.current = 0;
    setShowManualSend(false);
    liveTextSinceRef.current = null;
    setHistoryExpanded(false);
    void stop();
    stopAudio();
    if (durationRef.current) clearInterval(durationRef.current);

    if (messagesRef.current.length > 1) {
      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesRef.current,
          sessionStart,
          sessionEnd: Date.now(),
          sessionId,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data?.homeworkId) pendingHomeworkRepsRef.current += 15;
        })
        .catch(() => {});
    }
    const finalDuration = duration;
    const finalMessages = [...messagesRef.current];
    if (onCallEnded && finalMessages.length > 1) {
      onCallEnded(finalMessages, finalDuration);
    }
    setPhase("idle");
    setMessages([]);
    setDuration(0);
  }, [stop, stopAudio, sessionStart, sessionId, duration, onCallEnded, clearPrewarmTimer, setJetztDu]);

  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _cm_active = false;
      stop();
      stopAudio();
      if (durationRef.current) clearInterval(durationRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [stop, stopAudio]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const canCall = contextReady && !limitReached;

  // ── IDLE ──────────────────────────────────────────────
  if (phase === "idle") return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", paddingTop: "calc(env(safe-area-inset-top,0px) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 300, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>
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

      {pendingHomework && pendingHomework.progress && pendingHomework.progress.completedReps < pendingHomework.progress.totalReps && (
        <div style={{ textAlign: "center", marginBottom: 20, padding: "12px 16px", maxWidth: 300, background: "rgba(212,168,67,0.08)", border: "0.5px solid var(--accent-dim)", borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: "var(--accent)", marginBottom: 8 }}>
            📋 Hausaufgaben offen ({pendingHomework.progress.totalReps - pendingHomework.progress.completedReps} Aufnahmen)
          </p>
          <a href="/words?view=homework" style={{ display: "inline-block", fontSize: 12, color: "var(--text)", marginBottom: 8, textDecoration: "underline" }}>
            Hausaufgaben machen →
          </a>
        </div>
      )}

      <CallPreCallSetup onSettingsChange={s => { callSettingsRef.current = s; }} />

      <div style={{ position: "relative", width: 80, height: 80, marginBottom: pendingHomework ? 12 : 32, marginTop: contextReady && limitReached ? 0 : 8 }}>
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
          onClick={() => startCall()}
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

      {pendingHomework && pendingHomework.progress && pendingHomework.progress.completedReps < pendingHomework.progress.totalReps && canCall && (
        <button
          type="button"
          onClick={() => startCall(true)}
          style={{ marginBottom: 16, padding: "10px 20px", borderRadius: 8, border: "0.5px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
        >
          Direkt reden (Skip Erinnerung)
        </button>
      )}

      {!embedded && (
        <a href="/mode" style={{ marginTop: 40, fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>← Modus wechseln</a>
      )}
    </div>
  );

  // ── ACTIVE ────────────────────────────────────────────
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

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid #e8e0f0", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isMuted && callState === "listening" ? "var(--border)" : callState === "speaking" ? "var(--green)" : callState === "listening" ? "var(--accent)" : "var(--border)", boxShadow: isMuted && callState === "listening" ? "none" : callState === "speaking" ? "0 0 6px rgba(39,174,96,0.6)" : callState === "listening" ? "0 0 6px rgba(212,168,67,0.6)" : "none", transition: callState === "speaking" || callState === "thinking" ? "none" : "all 0.3s", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#8a7060", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {isMuted && callState === "listening" ? "STUMM" : callState === "listening" && jetztDuActive ? "JETZT DU" : callState === "listening" ? "HOERT ZU" : callState === "thinking" ? "DENKT NACH" : ttsError ? "FEHLER" : "SPRICHT"}
          </span>
        </div>
        <CallGrammarProgressHud
          messages={messages}
          compact
          paused={callState === "speaking" || callState === "thinking"}
        />
        <span style={{ fontSize: 13, color: "#8a7060", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{fmt(duration)}</span>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "7px 12px",
          textAlign: "center",
          fontSize: 11,
          lineHeight: 1.35,
          color: networkIssue ? "#7a3030" : tabInactiveWarning ? "#8a4a20" : "#7c6a58",
          background: networkIssue ? "rgba(180,60,60,0.15)" : tabInactiveWarning ? "rgba(212,168,67,0.18)" : "rgba(127,119,221,0.08)",
          borderBottom: `0.5px solid ${networkIssue ? "rgba(180,60,60,0.35)" : tabInactiveWarning ? "rgba(212,168,67,0.35)" : "rgba(127,119,221,0.15)"}`,
        }}
      >
        {networkIssue
          ? networkIssue
          : tabInactiveWarning
            ? "Tab inaktiv — bitte zurück zum Browser · Please return and keep the browser active"
            : "Bitte Browser aktiv lassen · Please keep the browser active"}
      </div>

      {/* Conversation — bubble panel */}
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
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gradient-soft)", border: "2px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, color: "var(--accent)" }}>M</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Maya verbindet...</p>
          </div>
        )}

        {hiddenMessageCount > 0 && (
          <button
            type="button"
            onClick={() => setHistoryExpanded(true)}
            style={{
              alignSelf: "center",
              marginBottom: 4,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(127, 119, 221, 0.35)",
              background: "rgba(127, 119, 221, 0.1)",
              color: "#7F77DD",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↑ {hiddenMessageCount} frühere {hiddenMessageCount === 1 ? "Nachricht" : "Nachrichten"} anzeigen
          </button>
        )}

        {historyExpanded && messages.filter(m => m.role === "user").length > COLLAPSE_AFTER_USER_TURNS && (
          <button
            type="button"
            onClick={() => {
              setHistoryExpanded(false);
              transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
            }}
            style={{
              alignSelf: "center",
              marginBottom: 4,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "#fff",
              color: "var(--text-muted)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Verlauf einklappen · Show less
          </button>
        )}

        {visibleMessages.map(({ msg, messageIndex: i }) => (
          <div key={i} style={{ maxWidth: "85%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", animation: "fade-in 0.2s ease-out" }}>
            <div style={{ padding: "10px 14px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? "linear-gradient(135deg, #7c4daa, #e8643a)" : "#f0ebff", border: `0.5px solid ${msg.role === "user" ? "transparent" : "#ddd5f0"}` }}>
              <div style={{ fontSize: 10, color: msg.role === "assistant" ? "var(--accent)" : "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                {msg.role === "user" ? (user?.name ?? "Du") : "Maya"}
              </div>
              <p style={{ fontSize: 14, color: msg.role === "user" ? "#ffffff" : "#2d1f1a", lineHeight: 1.6, margin: 0 }}>{msg.content.replace(/<end>/g, "").trim()}</p>
              {msg.role === "user" && <CallGrammarTurnBadge msg={msg} inverted />}
              {msg.translation && msg.role === "assistant" && (
                <p style={{ fontSize: 11, color: "#7c4daa", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>💡 {msg.translation}</p>
              )}
            </div>
          </div>
        ))}

        {showJetztDuNudge && jetztDuActive && callState === "listening" && !liveText && (
          <div style={{ maxWidth: "85%", alignSelf: "flex-start", animation: "fade-in 0.25s ease-out" }}>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                background: "rgba(212,168,67,0.14)",
                border: "1px solid rgba(212,168,67,0.35)",
                boxShadow: "0 2px 8px rgba(212,168,67,0.12)",
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: "#7c4daa", margin: 0, lineHeight: 1.4 }}>
                🎙️ Jetzt du — sprich laut
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", lineHeight: 1.35 }}>
                Your turn — speak now
              </p>
            </div>
          </div>
        )}

        {showMayaReplyNudge && callState === "thinking" && (
          <div style={{ maxWidth: "85%", alignSelf: "flex-end", animation: "fade-in 0.25s ease-out" }}>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                background: "rgba(29,158,117,0.12)",
                border: "1px solid rgba(29,158,117,0.35)",
                boxShadow: "0 2px 8px rgba(29,158,117,0.1)",
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: "#1D9E75", margin: 0, lineHeight: 1.4 }}>
                ✓ Verstanden — Maya antwortet
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", lineHeight: 1.35 }}>
                Got it — Maya is replying
              </p>
            </div>
          </div>
        )}

        {/* Live text while speaking */}
        {liveText && callState === "listening" && jetztDuActive && (
          <div style={{ maxWidth: "85%", alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ padding: "10px 14px", borderRadius: "16px 16px 4px 16px", background: "linear-gradient(135deg, #7c4daa, #e8643a)", border: "0.5px solid transparent" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{user?.name ?? "Du"}</div>
              <p style={{ fontSize: 14, color: "#ffffff", lineHeight: 1.6, margin: 0 }}>
                {liveText.replace(/<end>/g, "").trim()}
                <span style={{ display: "inline-block", width: 2, height: "1em", background: "rgba(255,255,255,0.85)", marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" }} />
              </p>
            </div>
            {!isMuted && showManualSend && (
              <button
                type="button"
                onClick={forceSendTurn}
                aria-label="Antwort senden"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(127, 119, 221, 0.45)",
                  background: "rgba(127, 119, 221, 0.12)",
                  color: "#7F77DD",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(45, 32, 24, 0.06)",
                }}
              >
                Senden → · Send
              </button>
            )}
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
      </div>

      {/* Bottom — pinned controls (never scroll away) */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "6px 16px 8px",
          borderTop: "0.5px solid #e8e0f0",
          background: "var(--bg)",
          boxShadow: "0 -2px 10px rgba(45, 32, 24, 0.05)",
        }}
      >

        {/* Volume bars */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 18 }}>
          {Array.from({ length: 9 }, (_, i) => {
            const height = isMuted
              ? 3
              : callState === "listening"
              ? Math.max(3, Math.min(18, (volume / 50) * 18 * Math.abs(Math.sin((i + 1) * 0.7))))
              : callState === "speaking"
              ? 5 + Math.abs(Math.sin(i * 0.8)) * 8
              : 3;
            return (
              <div key={i} style={{
                width: 3, borderRadius: 2, transition: callState === "speaking" || callState === "thinking" ? "none" : "height 0.1s",
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

        {ttsError && (
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{ttsError}</p>
            <button
              type="button"
              onClick={retryTTS}
              style={{
                minHeight: 36,
                padding: "0 16px",
                borderRadius: 8,
                border: "0.5px solid var(--accent-dim)",
                background: "var(--surface)",
                color: "var(--accent)",
                fontSize: 12,
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              Maya erneut abspielen
            </button>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Mikrofon einschalten" : "Mikrofon stummschalten"}
            aria-pressed={isMuted}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              background: isMuted ? "rgba(192,57,43,0.12)" : "var(--surface)",
              border: `1.5px solid ${isMuted ? "rgba(192,57,43,0.45)" : "var(--accent-dim)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
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
            onClick={endCall}
            aria-label="Anruf beenden"
            style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(192,57,43,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", boxShadow: "0 3px 12px rgba(192,57,43,0.28)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
        {isMuted && callState === "listening" && (
          <p style={{ fontSize: 10, color: "#8a7060", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginTop: -4 }}>Mikrofon stumm</p>
        )}
      </div>
    </div>
  );
}
