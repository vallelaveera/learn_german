"use client";
import { useRef, useCallback, useState } from "react";
import { Mic, Square } from "lucide-react";

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
      aria-label={recording ? "Aufnahme stoppen" : "Aufnahme starten"}
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        border: "none",
        background: recording ? "var(--red)" : "var(--gradient)",
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: recording
          ? "0 0 0 10px rgba(220,74,58,0.15), var(--shadow-md)"
          : "var(--shadow-lg)",
        WebkitTapHighlightColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.96)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {recording ? <Square size={26} fill="currentColor" /> : <Mic size={28} strokeWidth={2} />}
    </button>
  );
}

export async function playBlobUrl(url: string): Promise<void> {
  const audio = new Audio(url);
  await audio.play();
}
