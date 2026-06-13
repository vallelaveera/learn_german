import { buildOnboardingOpeningPart2 } from "@/lib/memory-agent";

export const ONBOARDING_PRACTICE_QUESTION = buildOnboardingOpeningPart2();

let cachedBlobUrl: string | null = null;
let prefetchPromise: Promise<void> | null = null;

export async function prefetchCallOnboardingPracticeQuestion(
  provider: "soniox" | "fish" = "soniox",
): Promise<void> {
  if (cachedBlobUrl || typeof window === "undefined") return;
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ONBOARDING_PRACTICE_QUESTION, provider }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (blob.size > 0) cachedBlobUrl = URL.createObjectURL(blob);
    } catch {
      /* streamTTS fallback at play time */
    } finally {
      prefetchPromise = null;
    }
  })();

  return prefetchPromise;
}

/** Returns true when cached MP3 was played. */
export async function playCallOnboardingPracticeQuestion(
  getAudioCtx: () => AudioContext,
): Promise<boolean> {
  if (!cachedBlobUrl) return false;
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
    return true;
  } catch {
    return false;
  }
}
