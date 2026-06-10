"use client";
import { useRef, useCallback, useState } from "react";

interface HomeworkRecorderProps {
  onRecorded: (blob: Blob, transcript?: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export function HomeworkRecorder({ onRecorded, onError, disabled }: HomeworkRecorderProps) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) onRecorded(blob);
        else onError("Aufnahme zu kurz");
      };

      recorder.onerror = () => onError("Aufnahme fehlgeschlagen");

      recorder.start();
      setRecording(true);
    } catch {
      onError("Mikrofon nicht verfügbar");
    }
  }, [disabled, recording, onRecorded, onError]);

  const toggle = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: "none",
        background: recording ? "var(--red)" : "var(--green)",
        color: "white",
        fontSize: 24,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: recording
          ? "0 0 0 8px rgba(192,57,43,0.2)"
          : "0 0 0 8px rgba(39,174,96,0.15)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {recording ? "■" : "🎙"}
    </button>
  );
}

export async function playBlobUrl(url: string): Promise<void> {
  const audio = new Audio(url);
  await audio.play();
}
