import { fetchTTS } from "@/components/AudioPlayer";

export type ExerciseSpeechLang = "de" | "en";

let activeAudio: HTMLAudioElement | null = null;

export function stopExerciseSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
}

export async function speakExercisePrompt(text: string, lang: ExerciseSpeechLang): Promise<void> {
  if (!text.trim()) return;
  stopExerciseSpeech();

  if (lang === "de") {
    const url = await fetchTTS(text);
    const audio = new Audio(url);
    activeAudio = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        activeAudio = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        activeAudio = null;
        reject(new Error("TTS playback failed"));
      };
      audio.play().catch(reject);
    });
    return;
  }

  if (typeof window === "undefined" || !window.speechSynthesis) return;

  await new Promise<void>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
