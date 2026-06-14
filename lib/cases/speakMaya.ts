import { playMp3Blob } from "@/lib/audio/play-mp3-element";
import { unlockExerciseAudio, stopExerciseSpeech } from "@/lib/exercise-speech";

export async function speakMayaGerman(text: string): Promise<void> {
  if (!text.trim()) return;
  unlockExerciseAudio();
  stopExerciseSpeech();

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), language: "de" }),
  });

  if (!res.ok) throw new Error("Maya TTS failed");

  const blob = await res.blob();
  await playMp3Blob(blob);
}
