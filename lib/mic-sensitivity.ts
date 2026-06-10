export type MicSensitivity = "quiet" | "normal" | "loud";

export interface MicSensitivityPreset {
  label: string;
  description: string;
  /** Volume-meter fallback when Silero VAD unavailable */
  speechThreshold: number;
  silenceThreshold: number;
  speechFramesMin: number;
  vadPositive: number;
  vadNegative: number;
  minSpeechMs: number;
  redemptionMs: number;
  audioHangoverMs: number;
}

export const MIC_SENSITIVITY_PRESETS: Record<MicSensitivity, MicSensitivityPreset> = {
  quiet: {
    label: "Ruhig",
    description: "Leises Zimmer, Mikro nah",
    speechThreshold: 50,
    silenceThreshold: 38,
    speechFramesMin: 14,
    vadPositive: 0.55,
    vadNegative: 0.4,
    minSpeechMs: 350,
    redemptionMs: 1200,
    audioHangoverMs: 450,
  },
  normal: {
    label: "Normal",
    description: "Standard — filtert leises Rauschen",
    speechThreshold: 58,
    silenceThreshold: 42,
    speechFramesMin: 20,
    vadPositive: 0.68,
    vadNegative: 0.48,
    minSpeechMs: 450,
    redemptionMs: 1400,
    audioHangoverMs: 500,
  },
  loud: {
    label: "Laut",
    description: "Fan, Tastatur — nur echte Sprache",
    speechThreshold: 68,
    silenceThreshold: 48,
    speechFramesMin: 28,
    vadPositive: 0.78,
    vadNegative: 0.58,
    minSpeechMs: 550,
    redemptionMs: 1600,
    audioHangoverMs: 550,
  },
};

const STORAGE_KEY = "call_mic_sensitivity";

export function getMicSensitivity(): MicSensitivity {
  if (typeof window === "undefined") return "normal";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "quiet" || v === "loud" || v === "normal") return v;
  return "normal";
}

export function setMicSensitivity(value: MicSensitivity): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, value);
}

export function getMicSensitivityPreset(sensitivity?: MicSensitivity): MicSensitivityPreset {
  const key = sensitivity ?? getMicSensitivity();
  return MIC_SENSITIVITY_PRESETS[key];
}
