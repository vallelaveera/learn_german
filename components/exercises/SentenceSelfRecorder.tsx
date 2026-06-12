"use client";

import { useRef, useCallback, useState } from "react";
import { Mic, Square, Play, VolumeX } from "lucide-react";

interface SentenceSelfRecorderProps {
  onRecorded: (blobUrl: string) => void;
  recordingUrl?: string | null;
  skipMaya: boolean;
  onSkipMayaChange: (value: boolean) => void;
  compact?: boolean;
}

export function SentenceSelfRecorder({
  onRecorded,
  recordingUrl,
  skipMaya,
  onSkipMayaChange,
  compact = false,
}: SentenceSelfRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (recording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          onRecorded(URL.createObjectURL(blob));
        } else {
          setError("Aufnahme zu kurz");
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError("Mikrofon nicht verfügbar");
    }
  }, [recording, onRecorded]);

  const toggle = () => {
    if (recording) stopRecording();
    else void startRecording();
  };

  const playRecording = () => {
    if (!recordingUrl) return;
    const audio = new Audio(recordingUrl);
    void audio.play();
  };

  const btnSize = compact ? 40 : 48;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={recording ? "Stoppen" : "Satz aufnehmen"}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: "50%",
            border: "none",
            background: recording ? "var(--red)" : "var(--gradient)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {recording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
        </button>
        {recordingUrl && (
          <button
            type="button"
            onClick={playRecording}
            className="ui-btn-ghost"
            style={{ minHeight: btnSize, padding: "0 14px" }}
          >
            <Play size={16} />
            Nochmal hören
          </button>
        )}
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--text-muted)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={skipMaya}
          onChange={e => onSkipMayaChange(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        <VolumeX size={14} />
        Maya überspringen — nur meine Stimme
      </label>
      {error && <p style={{ fontSize: 11, color: "var(--red)", margin: 0 }}>{error}</p>}
    </div>
  );
}

export async function playRecordingUrls(urls: string[]): Promise<void> {
  for (const url of urls) {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("playback failed"));
      void audio.play().catch(reject);
    });
  }
}
