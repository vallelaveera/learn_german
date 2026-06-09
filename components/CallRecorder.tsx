"use client";
import { useRef, useCallback } from "react";

const SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const SAMPLE_RATE = 16000;

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
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const start = useCallback(async () => {
    finishedFiredRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Use existing AudioContext if available (iOS requires it created on user gesture)
      const ctx = audioCtxRef.current ?? new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);

      // Volume analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const measureVolume = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        onVolume(avg);
        animFrameRef.current = requestAnimationFrame(measureVolume);
      };
      measureVolume();

      // ScriptProcessor to capture raw PCM — works on iOS
      const bufferSize = 4096;
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(ctx.destination);

      // Connect to Soniox
      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send config with pcm_s16le — works on ALL platforms including iOS
        ws.send(JSON.stringify({
          api_key: apiKey,
          model: "stt-rt-v4",
          audio_format: "pcm_s16le",
          sample_rate: SAMPLE_RATE,
          num_channels: 1,
          language_hints: ["de", "en"],
          enable_endpoint_detection: true,
        }));

        // Start sending PCM audio
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);

          // Resample to 16kHz if needed
          const ratio = ctx.sampleRate / SAMPLE_RATE;
          const outLen = Math.floor(float32.length / ratio);
          const pcm = new Int16Array(outLen);

          for (let i = 0; i < outLen; i++) {
            const s = Math.max(-1, Math.min(1, float32[Math.floor(i * ratio)]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          ws.send(pcm.buffer);
        };
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

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(""); // signal end of audio
    }
    setTimeout(() => {
      wsRef.current?.close();
      wsRef.current = null;
    }, 500);
  }, [onVolume]);

  // Expose audioCtxRef so call page can set it on user gesture
  return { start, stop, audioCtxRef };
}
