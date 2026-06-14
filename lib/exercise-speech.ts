import { playMp3Blob, stopActiveMp3Playback } from "@/lib/audio/play-mp3-element";
import { fetchTTS } from "@/components/AudioPlayer";

export type ExerciseSpeechLang = "de" | "en";

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeSpeakGeneration = 0;
const inflightSpeak = new Map<string, Promise<void>>();
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
  stopActiveMp3Playback();
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

async function playGermanFromUrl(url: string, generation: number): Promise<void> {
  stopActiveAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  activeAudioUrl = url;
  const res = await fetch(url);
  const blob = await res.blob();

  await playMp3Blob(blob, {
    isCancelled: () => generation !== activeSpeakGeneration,
    onElement: audio => {
      activeAudio = audio;
    },
  });

  if (generation === activeSpeakGeneration) {
    activeAudio = null;
    activeAudioUrl = null;
  }
}

function speakGermanFallback(text: string, generation: number): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.reject(new Error("speech synthesis unavailable"));
  }
  stopActiveAudio();
  window.speechSynthesis.cancel();
  return new Promise<void>(resolve => {
    if (generation !== activeSpeakGeneration) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

async function speakExercisePromptInner(text: string, lang: ExerciseSpeechLang): Promise<void> {
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

export async function speakExercisePrompt(text: string, lang: ExerciseSpeechLang): Promise<void> {
  const inflightKey = `${lang}:${text.trim()}`;
  const existing = inflightSpeak.get(inflightKey);
  if (existing) return existing;

  const promise = speakExercisePromptInner(text, lang).finally(() => {
    if (inflightSpeak.get(inflightKey) === promise) {
      inflightSpeak.delete(inflightKey);
    }
  });
  inflightSpeak.set(inflightKey, promise);
  return promise;
}
