"use client";
import { useRef, useCallback } from "react";

const SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

interface SpeechRecorderOptions {
  apiKey: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (e: string) => void;
  onVolume?: (level: number) => void;
  onSpeechStart?: () => void;
}

export function useSpeechRecorder({
  apiKey,
  onTranscript,
  onEnd,
  onError,
  onVolume,
}: SpeechRecorderOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const endFiredRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const startVolumeTracking = (stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      onVolume?.(avg / 128); // normalize 0-1
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const start = useCallback(async () => {
    endFiredRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      startVolumeTracking(stream);

      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          api_key: apiKey,
          model: "stt-rt-v4",
          language_hints: ["de", "en"],
          enable_endpoint_detection: true,
          audio_format: "webm",
        }));

        const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        mr.start(100); // 100ms chunks for lower latency
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
        if (res.finished && !endFiredRef.current) {
          endFiredRef.current = true;
          onEnd();
        }
      };

      ws.onerror = () => onError("WebSocket error");
      ws.onclose = () => {};
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Microphone error");
    }
  }, [apiKey, onTranscript, onEnd, onError, onVolume]);

  const stop = useCallback(() => {
    endFiredRef.current = true; // block any late onEnd
    cancelAnimationFrame(animFrameRef.current);
    onVolume?.(0);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send("");
    }
    setTimeout(() => {
      wsRef.current?.close();
      wsRef.current = null;
    }, 300);
    mediaRecorderRef.current = null;
    streamRef.current = null;
  }, [onVolume]);

  return { start, stop };
}
