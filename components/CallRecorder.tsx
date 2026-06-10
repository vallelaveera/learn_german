"use client";
import { useRef, useCallback } from "react";
import { getMicSensitivityPreset } from "@/lib/mic-sensitivity";

const SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const VAD_ASSET_BASE = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const ONNX_WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/";

interface CallRecorderOptions {
  apiKey: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onFinished: () => void;
  onError: (e: string) => void;
  onVolume: (level: number) => void;
  onSpeechActive?: (active: boolean) => void;
  onVADReady?: (ready: boolean) => void;
  getContext?: () => string;
}

type MicVADInstance = {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
};

export function useCallRecorder({
  apiKey,
  onTranscript,
  onFinished,
  onError,
  onVolume,
  onSpeechActive,
  onVADReady,
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
  const sendAudioRef = useRef(false);
  const vadRef = useRef<MicVADInstance | null>(null);
  const hangoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHangover = useCallback(() => {
    if (hangoverTimerRef.current) {
      clearTimeout(hangoverTimerRef.current);
      hangoverTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    finishedFiredRef.current = false;
    finalBufferRef.current = "";
    sendAudioRef.current = false;
    clearHangover();

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
        if (mutedRef.current) {
          onVolume(0);
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        analyser.getByteFrequencyData(data);
        // Speech band only (~300–3400 Hz) — ignores low rumble / chair creaks
        const bandStart = Math.floor(data.length * 0.08);
        const bandEnd = Math.floor(data.length * 0.55);
        let sum = 0;
        for (let i = bandStart; i < bandEnd; i++) sum += data[i];
        onVolume(sum / (bandEnd - bandStart));
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
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN && sendAudioRef.current) {
            ws.send(e.data);
          }
        };

        mr.start(250);
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

      const preset = getMicSensitivityPreset();
      try {
        const { MicVAD } = await import("@ricky0123/vad-web");
        const vad = await MicVAD.new({
          audioContext: ctx,
          getStream: async () => {
            if (!streamRef.current) throw new Error("No microphone stream");
            return streamRef.current;
          },
          pauseStream: async () => {},
          resumeStream: async () => {
            if (!streamRef.current) throw new Error("No microphone stream");
            return streamRef.current;
          },
          baseAssetPath: VAD_ASSET_BASE,
          onnxWASMBasePath: ONNX_WASM_BASE,
          processorType: "auto",
          startOnLoad: false,
          positiveSpeechThreshold: preset.vadPositive,
          negativeSpeechThreshold: preset.vadNegative,
          minSpeechMs: preset.minSpeechMs,
          redemptionMs: preset.redemptionMs,
          onSpeechStart: () => {
            if (mutedRef.current) return;
            clearHangover();
            sendAudioRef.current = true;
            onSpeechActive?.(true);
          },
          onSpeechEnd: () => {
            if (mutedRef.current) return;
            onSpeechActive?.(false);
            clearHangover();
            hangoverTimerRef.current = setTimeout(() => {
              sendAudioRef.current = false;
              hangoverTimerRef.current = null;
            }, preset.audioHangoverMs);
          },
          onVADMisfire: () => {},
        });
        vadRef.current = vad;
        if (!mutedRef.current) await vad.start();
        onVADReady?.(true);
      } catch (vadErr) {
        console.warn("Silero VAD unavailable, using volume fallback", vadErr);
        sendAudioRef.current = !mutedRef.current;
        onVADReady?.(false);
      }
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Mikrofon Fehler");
    }
  }, [apiKey, onTranscript, onFinished, onError, onVolume, onSpeechActive, onVADReady, getContext, clearHangover]);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      if (muted && mr.state === "recording") mr.pause();
      else if (!muted && mr.state === "paused") mr.resume();
    }
    if (muted) {
      clearHangover();
      sendAudioRef.current = false;
      onSpeechActive?.(false);
      onVolume(0);
      vadRef.current?.pause().catch(() => {});
    } else {
      sendAudioRef.current = !!vadRef.current;
      vadRef.current?.start().catch(() => {
        sendAudioRef.current = true;
      });
    }
  }, [onVolume, onSpeechActive, clearHangover]);

  const stop = useCallback(() => {
    finishedFiredRef.current = true;
    mutedRef.current = false;
    clearHangover();
    sendAudioRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    onVolume(0);
    onSpeechActive?.(false);
    try { silentNodeRef.current?.stop(); } catch {}
    silentNodeRef.current = null;
    if (vadRef.current) {
      vadRef.current.destroy().catch(() => {});
      vadRef.current = null;
    }
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
  }, [onVolume, onSpeechActive, clearHangover]);

  return { start, stop, setMuted, audioCtxRef };
}
