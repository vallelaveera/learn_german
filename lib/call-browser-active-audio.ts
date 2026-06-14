import { playMp3Blob, playMp3Url } from "@/lib/audio/play-mp3-element";

export const KEEP_BROWSER_ACTIVE_SPOKEN =
  "Bitte lass den Browser aktiv. Please keep the browser active.";

export const KEEP_BROWSER_ACTIVE_BANNER =
  "Bitte Browser aktiv lassen · Please keep the browser active";

let cachedBlobUrl: string | null = null;
let prefetchPromise: Promise<void> | null = null;

export async function prefetchCallBrowserActiveMessage(
  provider: "soniox" | "fish" = "soniox",
): Promise<void> {
  if (cachedBlobUrl || typeof window === "undefined") return;
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: KEEP_BROWSER_ACTIVE_SPOKEN, provider }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (blob.size > 0) cachedBlobUrl = URL.createObjectURL(blob);
    } catch {
      /* fetch Maya TTS at play time */
    } finally {
      prefetchPromise = null;
    }
  })();

  return prefetchPromise;
}

async function fetchAndPlayMayaTts(
  text: string,
  provider: "soniox" | "fish",
): Promise<void> {
  const res = await fetch("/api/tts-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  if (blob.size === 0) return;
  await playMp3Blob(blob);
}

export async function playCallBrowserActiveMessage(
  _getAudioCtx: () => AudioContext,
  provider: "soniox" | "fish" = "soniox",
): Promise<void> {
  if (cachedBlobUrl) {
    try {
      await playMp3Url(cachedBlobUrl);
      return;
    } catch {
      /* fall through to live Maya TTS */
    }
  }
  await fetchAndPlayMayaTts(KEEP_BROWSER_ACTIVE_SPOKEN, provider);
}
