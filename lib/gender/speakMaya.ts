import { unlockExerciseAudio, stopExerciseSpeech } from "@/lib/exercise-speech";

let activeGenderAudio: HTMLAudioElement | null = null;

export function stopMayaGenderSpeech() {
  stopExerciseSpeech();
  if (activeGenderAudio) {
    activeGenderAudio.pause();
    activeGenderAudio.currentTime = 0;
    activeGenderAudio = null;
  }
}

/** Play mnemonic sentence with Soniox Maya (English). */
export async function speakMayaGenderSentence(text: string): Promise<void> {
  if (!text.trim()) return;
  unlockExerciseAudio();
  stopMayaGenderSpeech();

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), language: "en" }),
  });

  if (!res.ok) {
    throw new Error("Maya TTS failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeGenderAudio = audio;

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      activeGenderAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      activeGenderAudio = null;
      reject(new Error("playback failed"));
    };
    audio.play().catch(reject);
  });
}
