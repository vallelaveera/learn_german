"use client";
import { useRef, useCallback } from "react";

const SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket";

interface SpeechRecorderOptions {
  apiKey: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (e: string) => void;
}

export function useSpeechRecorder({
  apiKey,
  onTranscript,
  onEnd,
  onError,
}: SpeechRecorderOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });
      streamRef.current = stream;

      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            api_key: apiKey,
            model: "stt-rt-v4",
            language_hints: ["de", "en"],
            enable_endpoint_detection: true,
            audio_format: "webm",
          })
        );

        const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        mr.start(200); // send chunks every 200ms
      };

      ws.onmessage = (event) => {
        const res = JSON.parse(event.data);
        if (res.error_code) {
          onError(`${res.error_code}: ${res.error_message}`);
          return;
        }

        const finalTokens: string[] = [];
        const nonFinalTokens: string[] = [];

        for (const token of res.tokens ?? []) {
          if (token.text) {
            if (token.is_final) finalTokens.push(token.text);
            else nonFinalTokens.push(token.text);
          }
        }

        if (finalTokens.length > 0) {
          onTranscript(finalTokens.join(""), true);
        }
        if (nonFinalTokens.length > 0) {
          onTranscript(nonFinalTokens.join(""), false);
        }

        if (res.finished) onEnd();
      };

      ws.onerror = () => onError("WebSocket error");
      ws.onclose = () => onEnd();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Microphone error");
    }
  }, [apiKey, onTranscript, onEnd, onError]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(""); // signal end-of-audio
    }
    wsRef.current?.close();
    wsRef.current = null;
    mediaRecorderRef.current = null;
    streamRef.current = null;
  }, []);

  return { start, stop };
}
