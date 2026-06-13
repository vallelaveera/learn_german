import { unlockExerciseAudio, stopExerciseSpeech } from "@/lib/exercise-speech";

let activeCasesAudio: HTMLAudioElement | null = null;

export function stopMayaCasesSpeech() {
  stopExerciseSpeech();
  if (activeCasesAudio) {
    activeCasesAudio.pause();
    activeCasesAudio.currentTime = 0;
    activeCasesAudio = null;
  }
}

export async function speakMayaGerman(text: string): Promise<void> {
  if (!text.trim()) return;
  unlockExerciseAudio();
  stopMayaCasesSpeech();

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), language: "de" }),
  });

  if (!res.ok) throw new Error("Maya TTS failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeCasesAudio = audio;

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      activeCasesAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      activeCasesAudio = null;
      reject(new Error("playback failed"));
    };
    audio.play().catch(reject);
  });
}
