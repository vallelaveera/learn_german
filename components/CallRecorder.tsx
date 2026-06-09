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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const start = useCallback(async () => {
    try {
      const { RecordTranscribe } = await import("@soniox/speech-to-text-web");

      const recorder = new RecordTranscribe();
      recorderRef.current = recorder;

      recorder.onresult = (result: any) => {
        let finalText = "";
        let nonFinalText = "";
        for (const token of result.tokens ?? []) {
          if (!token.text) continue;
          if (token.is_final) finalText += token.text;
          else nonFinalText += token.text;
        }
        if (finalText) onTranscript(finalText, true);
        if (nonFinalText) onTranscript(nonFinalText, false);
        if (result.finished) onFinished();
      };

      recorder.onerror = (e: any) => onError(String(e));

      await recorder.start({
        apiKey,
        model: "stt-rt-v4",
        audioFormat: "s16le",
        sampleRate: 16000,
        numChannels: 1,
        languageHints: ["de", "en"],
        enableEndpointDetection: true,
      });

      // Volume tracking via stream
      if (recorder.stream) {
        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        const source = ctx.createMediaStreamSource(recorder.stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          onVolume(data.reduce((a, b) => a + b, 0) / data.length);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
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
