import { BETA_WELCOME_STORAGE_KEY } from "./types";

export function hasSeenBetaWelcome(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(BETA_WELCOME_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markBetaWelcomeSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BETA_WELCOME_STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}
