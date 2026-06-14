import { isNativePlatform } from "@/lib/native/platform";

type AudioContextCtor = typeof AudioContext;

function getAudioContextClass(): AudioContextCtor {
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  const Ctx = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) throw new Error("AudioContext not available");
  return Ctx;
}

/** Prefer playback latency on native WebViews for smoother TTS scheduling. */
export function createCallAudioContext(): AudioContext {
  const Ctx = getAudioContextClass();
  try {
    return new Ctx({ latencyHint: isNativePlatform() ? "playback" : "interactive" });
  } catch {
    return new Ctx();
  }
}

export async function resumeAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}
