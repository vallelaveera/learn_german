"use client";
import { useEffect, useRef } from "react";

interface AudioPlayerProps {
  audioUrl: string | null;
  onEnd?: () => void;
}

export function AudioPlayer({ audioUrl, onEnd }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => onEnd?.();
    return () => {
      audio.pause();
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, onEnd]);

  return null;
}

export async function fetchTTS(text: string): Promise<string> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("TTS failed");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
