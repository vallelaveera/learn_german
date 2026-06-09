"use client";
import { useRef, useCallback } from "react";

const SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

interface CallRecorderOptions {
  apiKey: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onFinished: () => void;
  onError: (e: string) => void;
  onVolume: (level: number) => void;
}

export function useCallRecorder({
  apiKey,
  onTranscript,
  onFinished,
  onError,
  onVolume,
}: CallRecorderOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const finishedFiredRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silentNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const start = useCallback(async () => {
    finishedFiredRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // iOS fix: keep AudioContext alive with a silent looping buffer
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      // Create silent buffer to prevent iOS from suspending AudioContext
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
        analyser.getByteFrequencyData(data);
        onVolume(data.reduce((a, b) => a + b, 0) / data.length);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      // WebSocket to Soniox
      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          api_key: apiKey,
          model: "stt-rt-v4",
          audio_format: "auto",
          language_hints: ["de", "en"],
          enable_endpoint_detection: true,
        }));

        // Detect best mimeType
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

        // iOS fix: use 500ms timeslice — longer chunks are more reliable on iOS
        mr.start(500);

        // iOS fix: also request data explicitly every 500ms
        const keepAlive = setInterval(() => {
          if (mr.state === "recording") {
            mr.requestData();
          } else {
            clearInterval(keepAlive);
          }
        }, 500);

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
        if (finalText) onTranscript(finalText, true);
        if (nonFinalText) onTranscript(nonFinalText, false);
        if (res.finished && !finishedFiredRef.current) {
          finishedFiredRef.current = true;
          onFinished();
        }
      };

      ws.onerror = () => onError("Verbindungsfehler");
      ws.onclose = () => {};
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Mikrofon Fehler");
    }
  }, [apiKey, onTranscript, onFinished, onError, onVolume]);

  const stop = useCallback(() => {
    finishedFiredRef.current = true;
    cancelAnimationFrame(animFrameRef.current);
    onVolume(0);

    // Stop silent node
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

  return { start, stop, audioCtxRef };
}
