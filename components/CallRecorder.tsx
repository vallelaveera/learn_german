"use client";
import { useRef, useCallback } from "react";

const SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

interface CallRecorderOptions {
  apiKey: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onFinished: () => void;
  onError: (e: string) => void;
  onVolume: (level: number) => void;
  onReady?: () => void;
  getContext?: () => string;
}

function pickMimeType(): string {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export function useCallRecorder({
  apiKey,
  onTranscript,
  onFinished,
  onError,
  onVolume,
  onReady,
  getContext,
}: CallRecorderOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const finishedFiredRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silentNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const finalBufferRef = useRef("");
  const mutedRef = useRef(false);
  const transcriptPausedRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const sessionGenRef = useRef(0);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingMimeRef = useRef("audio/webm");
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    onVolume(0);
    try { silentNodeRef.current?.stop(); } catch {}
    silentNodeRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, [onVolume]);

  const closeWs = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (!ws) return;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(""); } catch {}
    }
    setTimeout(() => {
      try { ws.close(); } catch {}
    }, 300);
  }, []);

  const start = useCallback(async () => {
    const sessionGen = ++sessionGenRef.current;
    intentionalStopRef.current = false;
    finishedFiredRef.current = false;
    finalBufferRef.current = "";
    recordingChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const silentBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const silentSource = ctx.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.loop = true;
      silentSource.connect(ctx.destination);
      silentSource.start();
      silentNodeRef.current = silentSource;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (mutedRef.current || transcriptPausedRef.current) {
          onVolume(0);
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        analyser.getByteFrequencyData(data);
        const start = Math.floor(data.length * 0.08);
        const end = Math.floor(data.length * 0.55);
        let sum = 0;
        for (let i = start; i < end; i++) sum += data[i];
        onVolume(sum / (end - start));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (sessionGen !== sessionGenRef.current) return;
        const context = getContext?.() ?? "";

        ws.send(JSON.stringify({
          api_key: apiKey,
          model: "stt-rt-v4",
          audio_format: "auto",
          language_hints: ["de"],
          enable_endpoint_detection: true,
          ...(context ? { context } : {}),
        }));

        const mimeType = pickMimeType();
        recordingMimeRef.current = mimeType || "audio/webm";
        const mr = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordingChunksRef.current.push(e.data);
            if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
          }
        };

        mr.onerror = () => onError("Mikrofon Fehler");

        mr.start(250);
        onReady?.();
        if (mutedRef.current) {
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
          onVolume(0);
        }

        keepAliveRef.current = setInterval(() => {
          const recorder = mediaRecorderRef.current;
          if (!recorder || recorder.state === "inactive") {
            if (keepAliveRef.current) {
              clearInterval(keepAliveRef.current);
              keepAliveRef.current = null;
            }
            return;
          }
          if (recorder.state === "recording") recorder.requestData();
        }, 250);
      };

      ws.onmessage = (event) => {
        if (sessionGen !== sessionGenRef.current) return;
        const res = JSON.parse(event.data);
        if (res.error_code) {
          // Soniox 408 = no audio stream — can happen if MediaRecorder was paused while muted.
          if (res.error_code === 408 && mutedRef.current) return;
          onError(`${res.error_code}: ${res.error_message}`);
          return;
        }
        if (transcriptPausedRef.current) return;

        let finalText = "";
        let nonFinalText = "";
        for (const token of res.tokens ?? []) {
          if (!token.text) continue;
          if (token.is_final) finalText += token.text;
          else nonFinalText += token.text;
        }

        if (finalText) {
          finalBufferRef.current += finalText;
          onTranscript(finalText, true);
        }
        if (nonFinalText) onTranscript(nonFinalText, false);

        if (res.finished && !finishedFiredRef.current) {
          finishedFiredRef.current = true;
          const words = finalBufferRef.current.trim().split(/\s+/).filter(Boolean);
          if (words.length >= 1) onFinished();
        }
      };

      ws.onerror = () => {
        if (intentionalStopRef.current || sessionGen !== sessionGenRef.current) return;
        onError("Verbindungsfehler");
      };
      ws.onclose = () => {
        if (intentionalStopRef.current || sessionGen !== sessionGenRef.current) return;
        onError("Verbindungsfehler");
      };
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Mikrofon Fehler");
    }
  }, [apiKey, onTranscript, onFinished, onError, onVolume, onReady, getContext]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    // Keep MediaRecorder running — pausing stops audio to Soniox and triggers 408 timeouts.
    if (muted || transcriptPausedRef.current) onVolume(0);
  }, [onVolume]);

  const setTranscriptPaused = useCallback((paused: boolean) => {
    transcriptPausedRef.current = paused;
    if (paused) onVolume(0);
  }, [onVolume]);

  const stop = useCallback((): Promise<Blob | null> => {
    intentionalStopRef.current = true;
    sessionGenRef.current += 1;
    finishedFiredRef.current = true;
    mutedRef.current = false;
    transcriptPausedRef.current = false;

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") {
      closeWs();
      cleanupStream();
      return Promise.resolve(null);
    }

    return new Promise(resolve => {
      mr.onstop = () => {
        const blob = recordingChunksRef.current.length
          ? new Blob(recordingChunksRef.current, { type: recordingMimeRef.current })
          : null;
        recordingChunksRef.current = [];
        closeWs();
        cleanupStream();
        resolve(blob && blob.size > 0 ? blob : null);
      };
      try {
        if (mr.state === "recording" || mr.state === "paused") mr.requestData();
        mr.stop();
      } catch {
        closeWs();
        cleanupStream();
        resolve(null);
      }
    });
  }, [cleanupStream, closeWs]);

  return { start, stop, setMuted, setTranscriptPaused, audioCtxRef };
}
