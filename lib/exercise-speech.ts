import { fetchTTS } from "@/components/AudioPlayer";

export type ExerciseSpeechLang = "de" | "en";

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeSpeakGeneration = 0;
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
  activeSpeakGeneration += 1;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  stopActiveAudio();
}

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
    activeAudioUrl = null;
  }
}

export function revokeExerciseSpeechPrefetch(text: string) {
  const key = text.trim();
  const url = dePrefetch.get(key);
  if (!url) return;
  if (url === activeAudioUrl) return;
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

function playGermanFromUrl(url: string, generation: number): Promise<void> {
  stopActiveAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  const audio = new Audio(url);
  activeAudio = audio;
  activeAudioUrl = url;
  return new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      if (generation !== activeSpeakGeneration) {
        resolve();
        return;
      }
      activeAudio = null;
      activeAudioUrl = null;
      resolve();
    };
    audio.onerror = () => {
      activeAudio = null;
      activeAudioUrl = null;
      reject(new Error("TTS playback failed"));
    };
    audio.play().catch(reject);
  });
}

function speakGermanFallback(text: string, generation: number): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.reject(new Error("speech synthesis unavailable"));
  }
  stopActiveAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  return new Promise<void>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    if (generation !== activeSpeakGeneration) {
      resolve();
      return;
    }
    window.speechSynthesis.speak(utterance);
  });
}

export async function speakExercisePrompt(text: string, lang: ExerciseSpeechLang): Promise<void> {
  if (!text.trim()) return;
  const key = text.trim();
  const generation = ++activeSpeakGeneration;
  unlockExerciseAudio();

  if (lang === "de") {
    const cached = dePrefetch.get(key);
    if (cached) {
      try {
        await playGermanFromUrl(cached, generation);
        return;
      } catch {
        if (generation !== activeSpeakGeneration) return;
        // retry fetch below
      }
    }

    try {
      const url = await fetchTTS(key);
      if (generation !== activeSpeakGeneration) {
        URL.revokeObjectURL(url);
        return;
      }
      dePrefetch.set(key, url);
      await playGermanFromUrl(url, generation);
      return;
    } catch {
      if (generation !== activeSpeakGeneration) return;
      await speakGermanFallback(key, generation);
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
