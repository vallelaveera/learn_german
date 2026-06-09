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

  const startVolumeTracking = (stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      onVolume(avg);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const start = useCallback(async () => {
    finishedFiredRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      startVolumeTracking(stream);

      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const audioFormat = mimeType.includes("mp4") ? "mp4" : "webm";

      ws.onopen = () => {
        ws.send(JSON.stringify({
          api_key: apiKey,
          model: "stt-rt-v4",
          language_hints: ["de", "en"],
          enable_endpoint_detection: true,
          audio_format: "auto",  // Soniox auto-detects — works on iOS and Android
        }));
        const mr = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        mr.start(250);
        // iOS fix: requestData keepalive
        const iosInterval = setInterval(() => {
          if (mr.state === 'recording') mr.requestData();
          else clearInterval(iosInterval);
        }, 250);
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
    cancelAnimationFrame(animFrameRef.current);
    onVolume(0);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send("");
    }
    setTimeout(() => wsRef.current?.close(), 500);
    wsRef.current = null;
    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, [onVolume]);

  return { start, stop };
}
