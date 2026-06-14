import type { OfflineLevel, OfflineWordCategory } from "./types";

export const OFFLINE_LEVELS: OfflineLevel[] = ["A1", "A2", "B1", "B2"];

export const OFFLINE_LEVEL_COLORS: Record<OfflineLevel, string> = {
  A1: "#1D9E75",
  A2: "#3B82F6",
  B1: "#6B4FA0",
  B2: "#085041",
};

export const OFFLINE_CATEGORY_LABELS: Record<OfflineWordCategory, string> = {
  food: "Essen & Trinken",
  travel: "Reisen",
  work: "Arbeit",
  home: "Zuhause",
  people: "Menschen",
  shopping: "Einkaufen",
  health: "Gesundheit",
  nature: "Natur",
  daily: "Alltag",
  education: "Schule & Lernen",
};

export const OFFLINE_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export const OFFLINE_PROGRESS_KEY = "offline_learning_progress_v1";

export const OFFLINE_DB_NAME = "callmedaily_offline_v1";
export const OFFLINE_DB_VERSION = 1;
