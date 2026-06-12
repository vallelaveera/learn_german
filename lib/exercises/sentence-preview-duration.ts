export const PREVIEW_DURATION_PRESETS = [3, 5, 10] as const;
export type PreviewDurationPreset = (typeof PREVIEW_DURATION_PRESETS)[number] | "custom";

export const DEFAULT_PREVIEW_SECONDS = 5;
export const MIN_CUSTOM_PREVIEW_SECONDS = 2;
export const MAX_CUSTOM_PREVIEW_SECONDS = 60;

const STORAGE_KEY = "cmd_sentence_preview_duration";

export interface SentencePreviewDurationSetting {
  preset: PreviewDurationPreset;
  customSeconds: number;
}

export function normalizePreviewSeconds(value: number): number {
  return Math.min(
    MAX_CUSTOM_PREVIEW_SECONDS,
    Math.max(MIN_CUSTOM_PREVIEW_SECONDS, Math.round(value)),
  );
}

export function resolvePreviewSeconds(setting: SentencePreviewDurationSetting): number {
  if (setting.preset === "custom") {
    return normalizePreviewSeconds(setting.customSeconds);
  }
  return setting.preset;
}

export function defaultPreviewDurationSetting(): SentencePreviewDurationSetting {
  return { preset: DEFAULT_PREVIEW_SECONDS, customSeconds: 8 };
}

export function loadPreviewDurationSetting(): SentencePreviewDurationSetting {
  if (typeof window === "undefined") return defaultPreviewDurationSetting();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreviewDurationSetting();
    const parsed = JSON.parse(raw) as Partial<SentencePreviewDurationSetting>;
    const preset = parsed.preset;
    const customSeconds = normalizePreviewSeconds(parsed.customSeconds ?? 8);

    if (preset === "custom") return { preset: "custom", customSeconds };
    if (preset === 3 || preset === 5 || preset === 10) {
      return { preset, customSeconds };
    }
    return defaultPreviewDurationSetting();
  } catch {
    return defaultPreviewDurationSetting();
  }
}

export function savePreviewDurationSetting(setting: SentencePreviewDurationSetting): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      preset: setting.preset,
      customSeconds: normalizePreviewSeconds(setting.customSeconds),
    }),
  );
}

export function previewDurationLabel(seconds: number): string {
  return `${seconds} Sek.`;
}
