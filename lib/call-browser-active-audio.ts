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
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export async function playCallBrowserActiveMessage(
  getAudioCtx: () => AudioContext,
): Promise<void> {
  if (cachedBlobUrl) {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const res = await fetch(cachedBlobUrl);
      const buffer = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      await new Promise<void>(resolve => {
        source.onended = () => resolve();
        source.start();
      });
      return;
    } catch {
      /* fall through */
    }
  }
  await speakFallback(KEEP_BROWSER_ACTIVE_SPOKEN);
}
