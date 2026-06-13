import { speakMayaGerman } from "@/lib/cases/speakMaya";

let activeTenseAudio: HTMLAudioElement | null = null;

export function stopMayaTenseSpeech() {
  if (activeTenseAudio) {
    activeTenseAudio.pause();
    activeTenseAudio.currentTime = 0;
    activeTenseAudio = null;
  }
}

/** Speak a German sentence from the tense timeline (Maya / Soniox). */
export async function speakMayaTense(text: string): Promise<void> {
  stopMayaTenseSpeech();
  await speakMayaGerman(text);
}
