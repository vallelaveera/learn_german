"use client";
import { useRef, useCallback } from "react";

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
  const recorderRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const start = useCallback(async () => {
    try {
      const { RecordTranscribe } = await import("@soniox/speech-to-text-web");

      const recorder = new RecordTranscribe({
        apiKey,
        onPartialResult(result: any) {
          let finalText = "";
          let nonFinalText = "";
          for (const token of result.tokens ?? []) {
            if (!token.text) continue;
            if (token.is_final) finalText += token.text;
            else nonFinalText += token.text;
          }
          if (finalText) onTranscript(finalText, true);
          if (nonFinalText) onTranscript(nonFinalText, false);
        },
        onFinished() {
          onFinished();
        },
        onError(status: string, message: string) {
          onError(`${status}: ${message}`);
        },
      });

      recorderRef.current = recorder;

      await recorder.start({
        model: "stt-rt-v4",
        languageHints: ["de", "en"],
        enableEndpointDetection: true,
      });

      // Volume tracking
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
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
      } catch {}

    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Mikrofon Fehler");
    }
  }, [apiKey, onTranscript, onFinished, onError, onVolume]);

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    onVolume(0);
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, [onVolume]);

  return { start, stop, audioCtxRef };
}
