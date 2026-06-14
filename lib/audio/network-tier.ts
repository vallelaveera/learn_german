import { isAndroidNative, isNativePlatform } from "@/lib/native/platform";

export type NetworkTier = "slow" | "medium" | "fast";

/** Default TTS read chunk size (bytes) before attempting MP3 decode. */
export const TTS_CHUNK_DESKTOP = 16384;
export const TTS_CHUNK_IOS = 32768;
export const TTS_CHUNK_ANDROID_FAST = 49152;
export const TTS_CHUNK_ANDROID_MEDIUM = 65536;
export const TTS_CHUNK_ANDROID_SLOW = 98304;

export function detectNetworkTier(): NetworkTier {
  if (typeof navigator === "undefined") return "medium";
  const conn = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean; downlink?: number };
    }
  ).connection;
  if (!conn) return "medium";
  if (conn.saveData) return "slow";
  const effective = conn.effectiveType;
  if (effective === "slow-2g" || effective === "2g") return "slow";
  if (effective === "3g") return "slow";
  if (typeof conn.downlink === "number" && conn.downlink < 1.5) return "slow";
  if (typeof conn.downlink === "number" && conn.downlink < 4) return "medium";
  return "fast";
}

/** Refine tier using time-to-first-byte on the TTS fetch (ms). */
export function refineNetworkTier(base: NetworkTier, firstByteMs: number): NetworkTier {
  if (firstByteMs > 1200) return "slow";
  if (firstByteMs > 500 && base === "fast") return "medium";
  if (firstByteMs > 800 && base === "medium") return "slow";
  return base;
}

export function getTtsStreamChunkSize(tier: NetworkTier = detectNetworkTier()): number {
  if (isAndroidNative()) {
    if (tier === "slow") return TTS_CHUNK_ANDROID_SLOW;
    if (tier === "medium") return TTS_CHUNK_ANDROID_MEDIUM;
    return TTS_CHUNK_ANDROID_FAST;
  }
  if (isNativePlatform()) {
    if (tier === "slow") return TTS_CHUNK_ANDROID_MEDIUM;
    return TTS_CHUNK_IOS;
  }
  if (tier === "slow") return TTS_CHUNK_IOS;
  return TTS_CHUNK_DESKTOP;
}

/** Buffer full MP3 before play — partial decodeAudioData chunks cause audible mid-sentence gaps. */
export function shouldBufferTtsBeforePlay(_tier: NetworkTier = detectNetworkTier()): boolean {
  return true;
}
