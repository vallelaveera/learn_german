import {
  buildOnboardingOpeningPart2,
  buildOnboardingOpeningPart3,
} from "@/lib/memory-agent";

export const ONBOARDING_STUDENT_QUESTION = buildOnboardingOpeningPart2();
export const ONBOARDING_PRACTICE_QUESTION = buildOnboardingOpeningPart3();

type OnboardingLineKey = "student" | "practice";

const LINE_TEXT: Record<OnboardingLineKey, string> = {
  student: ONBOARDING_STUDENT_QUESTION,
  practice: ONBOARDING_PRACTICE_QUESTION,
};

const caches: Record<OnboardingLineKey, { url: string | null; prefetch: Promise<void> | null }> = {
  student: { url: null, prefetch: null },
  practice: { url: null, prefetch: null },
};

export async function prefetchCallOnboardingLine(
  key: OnboardingLineKey,
  provider: "soniox" | "fish" = "soniox",
): Promise<void> {
  const cache = caches[key];
  if (cache.url || typeof window === "undefined") return;
  if (cache.prefetch) return cache.prefetch;

  cache.prefetch = (async () => {
    try {
      const res = await fetch("/api/tts-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: LINE_TEXT[key], provider }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (blob.size > 0) cache.url = URL.createObjectURL(blob);
    } catch {
      /* streamTTS fallback at play time */
    } finally {
      cache.prefetch = null;
    }
  })();

  return cache.prefetch;
}

export async function prefetchAllOnboardingLines(
  provider: "soniox" | "fish" = "soniox",
): Promise<void> {
  await Promise.all([
    prefetchCallOnboardingLine("student", provider),
    prefetchCallOnboardingLine("practice", provider),
  ]);
}

/** Returns true when cached MP3 was played. */
export async function playCallOnboardingLine(
  key: OnboardingLineKey,
  getAudioCtx: () => AudioContext,
): Promise<boolean> {
  const cache = caches[key];
  if (!cache.url) return false;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const res = await fetch(cache.url);
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

export const prefetchCallOnboardingStudentQuestion = (provider?: "soniox" | "fish") =>
  prefetchCallOnboardingLine("student", provider);

export const prefetchCallOnboardingPracticeQuestion = (provider?: "soniox" | "fish") =>
  prefetchCallOnboardingLine("practice", provider);

export const playCallOnboardingStudentQuestion = (getAudioCtx: () => AudioContext) =>
  playCallOnboardingLine("student", getAudioCtx);

export const playCallOnboardingPracticeQuestion = (getAudioCtx: () => AudioContext) =>
  playCallOnboardingLine("practice", getAudioCtx);
