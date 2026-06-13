export interface CallSettings {
  /** Pause after Maya finishes before you can speak (ms). */
  pauseBetweenTurnsMs: number;
  /** Open mic this many ms before Maya finishes speaking. */
  earlyMicMs: number;
}

export const DEFAULT_CALL_SETTINGS: CallSettings = {
  pauseBetweenTurnsMs: 400,
  earlyMicMs: 500,
};

const STORAGE_KEY = "maya_call_settings";

export function loadCallSettings(): CallSettings {
  if (typeof window === "undefined") return DEFAULT_CALL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CALL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CallSettings>;
    return {
      pauseBetweenTurnsMs: clampMs(parsed.pauseBetweenTurnsMs, 0, 3000, DEFAULT_CALL_SETTINGS.pauseBetweenTurnsMs),
      earlyMicMs: clampMs(parsed.earlyMicMs, 0, 2500, DEFAULT_CALL_SETTINGS.earlyMicMs),
    };
  } catch {
    return DEFAULT_CALL_SETTINGS;
  }
}

export function saveCallSettings(settings: CallSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function clampMs(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
