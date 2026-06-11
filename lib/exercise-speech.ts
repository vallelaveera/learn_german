import { fetchTTS } from "@/components/AudioPlayer";

export type ExerciseSpeechLang = "de" | "en";

let activeAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
const dePrefetch = new Map<string, string>();

export function unlockExerciseAudio() {
  if (audioUnlocked || typeof window === "undefined") return;
  audioUnlocked = true;
  try {
    const ctx = new AudioContext();
    void ctx.resume();
  } catch {
    // ignore
  }
}

export function stopExerciseSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export function revokeExerciseSpeechPrefetch(text: string) {
  const key = text.trim();
  const url = dePrefetch.get(key);
  if (!url) return;
  URL.revokeObjectURL(url);
  dePrefetch.delete(key);
}

export async function prefetchExerciseGerman(text: string): Promise<string | null> {
  const key = text.trim();
  if (!key) return null;
  if (dePrefetch.has(key)) return dePrefetch.get(key)!;

  try {
    const url = await fetchTTS(key);
    dePrefetch.set(key, url);
    return url;
  } catch {
    return null;
  }
}

function playGermanFromUrl(url: string): Promise<void> {
  stopExerciseSpeech();
  const audio = new Audio(url);
  activeAudio = audio;
  return new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      activeAudio = null;
      resolve();
    };
    audio.onerror = () => {
      activeAudio = null;
      reject(new Error("TTS playback failed"));
    };
    audio.play().catch(reject);
  });
}

function speakGermanFallback(text: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.reject(new Error("speech synthesis unavailable"));
  }
  stopExerciseSpeech();
  return new Promise<void>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export async function speakExercisePrompt(text: string, lang: ExerciseSpeechLang): Promise<void> {
  if (!text.trim()) return;
  unlockExerciseAudio();

  if (lang === "de") {
    const key = text.trim();
    const cached = dePrefetch.get(key);
    if (cached) {
      try {
        await playGermanFromUrl(cached);
        return;
      } catch {
        // retry fetch below
      }
    }

    try {
      const url = await fetchTTS(key);
      dePrefetch.set(key, url);
      await playGermanFromUrl(url);
      return;
    } catch {
      await speakGermanFallback(key);
    }
    return;
  }

  if (typeof window === "undefined" || !window.speechSynthesis) return;

  stopExerciseSpeech();
  await new Promise<void>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
