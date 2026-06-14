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

async function playDecodedMp3(
  buffer: ArrayBuffer,
  getAudioCtx: () => AudioContext,
): Promise<void> {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") await ctx.resume();
  const decoded = await ctx.decodeAudioData(buffer.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.connect(ctx.destination);
  await new Promise<void>(resolve => {
    source.onended = () => resolve();
    source.start();
  });
}

async function fetchAndPlayMayaTts(
  text: string,
  provider: "soniox" | "fish",
  getAudioCtx: () => AudioContext,
): Promise<void> {
  const res = await fetch("/api/tts-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  if (blob.size === 0) return;
  await playDecodedMp3(await blob.arrayBuffer(), getAudioCtx);
}

export async function playCallBrowserActiveMessage(
  getAudioCtx: () => AudioContext,
  provider: "soniox" | "fish" = "soniox",
): Promise<void> {
  if (cachedBlobUrl) {
    try {
      const res = await fetch(cachedBlobUrl);
      await playDecodedMp3(await res.arrayBuffer(), getAudioCtx);
      return;
    } catch {
      /* fall through to live Maya TTS */
    }
  }
  await fetchAndPlayMayaTts(KEEP_BROWSER_ACTIVE_SPOKEN, provider, getAudioCtx);
}
