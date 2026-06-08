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
  onSpeechStart,
}: SpeechRecorderOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const activeRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const SILENCE_THRESHOLD = 35;   // volume level 0-255 below = silence
  const SILENCE_DELAY = 1500;     // ms of silence before auto-stop

  const closeWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send("");
    }
    setTimeout(() => { wsRef.current?.close(); wsRef.current = null; }, 400);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    isSpeakingRef.current = false;
    onVolume?.(0);
  }, [onVolume]);

  const openWS = useCallback(() => {
    if (wsRef.current) return;
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

      if (!streamRef.current) return;
      const mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      mr.start(100);
      onSpeechStart?.();
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
      if (res.finished) onEnd();
    };

    ws.onerror = () => onError("WebSocket error");
  }, [apiKey, onTranscript, onEnd, onError, onSpeechStart]);

  const startVolumeLoop = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!activeRef.current) return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      onVolume?.(avg / 128);

      const isSpeaking = avg > SILENCE_THRESHOLD;

      if (isSpeaking) {
        // Clear any pending silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        // Open WS if not already open
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          // Only open WS after 300ms of sustained speech (avoids brief noises)
          setTimeout(() => {
            if (isSpeakingRef.current && activeRef.current) openWS();
          }, 300);
        }
      } else if (isSpeakingRef.current && !silenceTimerRef.current) {
        // Start silence countdown
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          closeWS();
        }, SILENCE_DELAY);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, [openWS, closeWS, onVolume]);

  const start = useCallback(async () => {
    activeRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;
      startVolumeLoop(stream);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Microphone error");
    }
  }, [startVolumeLoop, onError]);

  const stop = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    closeWS();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    onVolume?.(0);
  }, [closeWS, onVolume]);

  return { start, stop };
}
