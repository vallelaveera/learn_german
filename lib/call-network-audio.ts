import { playMp3Blob, playMp3Url } from "@/lib/audio/play-mp3-element";
import { NETWORK_ISSUE_SPOKEN_DE } from "@/lib/call-network";

export { NETWORK_ISSUE_SPOKEN_DE };

let cachedBlobUrl: string | null = null;
let prefetchPromise: Promise<void> | null = null;

export async function prefetchCallNetworkMessage(
  provider: "soniox" | "fish" = "soniox",
): Promise<void> {
  if (cachedBlobUrl || typeof window === "undefined") return;
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: NETWORK_ISSUE_SPOKEN_DE, provider }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (blob.size > 0) cachedBlobUrl = URL.createObjectURL(blob);
    } catch {
      /* speech synthesis fallback at play time */
    } finally {
      prefetchPromise = null;
    }
  })();

  return prefetchPromise;
}

function speakFallback(text: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.92;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export async function playCallNetworkMessage(
  _getAudioCtx: () => AudioContext,
): Promise<void> {
  if (cachedBlobUrl) {
    try {
      await playMp3Url(cachedBlobUrl);
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    const res = await fetch("/api/tts-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: NETWORK_ISSUE_SPOKEN_DE, provider: "soniox" }),
    });
    if (!res.ok) throw new Error("TTS failed");
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("empty TTS");
    await playMp3Blob(blob);
  } catch {
    await speakFallback(NETWORK_ISSUE_SPOKEN_DE);
  }
}
