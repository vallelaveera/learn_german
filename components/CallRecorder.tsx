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

  const start = useCallback(async () => {
    finishedFiredRef.current = false;
    finalBufferRef.current = "";
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

      // iOS: silent looping buffer keeps AudioContext alive
      const silentBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const silentSource = ctx.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.loop = true;
      silentSource.connect(ctx.destination);
      silentSource.start();
      silentNodeRef.current = silentSource;

      // Volume tracking
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (mutedRef.current) {
          onVolume(0);
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        analyser.getByteFrequencyData(data);
        // Speech band only (~300–3400 Hz) — ignores low rumble / chair creaks
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
        const context = getContext?.() ?? "";

        ws.send(JSON.stringify({
          api_key: apiKey,
          model: "stt-rt-v4",
          audio_format: "auto",
          language_hints: ["de"],
          enable_endpoint_detection: true,
          ...(context ? { context } : {}),
        }));

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

        const mr = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        mr.start(250);
        onReady?.();
        if (mutedRef.current) {
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
          if (mr.state === "recording") mr.pause();
          onVolume(0);
        }

        const keepAlive = setInterval(() => {
          if (mr.state === "recording") mr.requestData();
          else clearInterval(keepAlive);
        }, 250);

        mr.onerror = () => onError("Mikrofon Fehler");
      };

      ws.onmessage = (event) => {
        const res = JSON.parse(event.data);
        if (res.error_code) { onError(`${res.error_code}: ${res.error_message}`); return; }

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
          if (words.length >= 1) {
            onFinished();
          }
        }
      };

      ws.onerror = () => onError("Verbindungsfehler");
      ws.onclose = () => {};
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Mikrofon Fehler");
    }
  }, [apiKey, onTranscript, onFinished, onError, onVolume, onReady, getContext]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      if (muted && mr.state === "recording") mr.pause();
      else if (!muted && mr.state === "paused") mr.resume();
    }
    if (muted) onVolume(0);
  }, [onVolume]);

  const stop = useCallback(() => {
    finishedFiredRef.current = true;
    mutedRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    onVolume(0);
    try { silentNodeRef.current?.stop(); } catch {}
    silentNodeRef.current = null;
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send("");
    }
    setTimeout(() => {
      wsRef.current?.close();
      wsRef.current = null;
    }, 500);
    mediaRecorderRef.current = null;
    streamRef.current = null;
  }, [onVolume]);

  return { start, stop, setMuted, audioCtxRef };
}
