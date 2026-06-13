/** German phrase Maya speaks when the call hits a connectivity problem. */
export const NETWORK_ISSUE_SPOKEN_DE =
  "Es gibt ein Verbindungsproblem. Bitte prüfe dein Internet und versuche es gleich noch einmal.";

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function normalizeErrorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

/** True when the browser reports no connectivity. */
export function isOfflineNetworkState(): boolean {
  return isBrowserOffline();
}

/**
 * Heuristic: failed fetch / STT socket / no response — not mic, rate-limit, or mute timeouts.
 * We cannot prove "internet down" vs "server down"; treat both as connection issues for the user.
 */
export function isLikelyNetworkError(error: unknown): boolean {
  if (isBrowserOffline()) return true;
  const text = normalizeErrorText(error).toLowerCase();
  if (!text) return false;
  if (text.includes("408") || text.includes("429")) return false;
  if (text.includes("mikrofon")) return false;
  if (
    text.includes("verbindungsfehler") ||
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("network error") ||
    text.includes("load failed") ||
    text.includes("net::") ||
    text.includes("websocket") ||
    text.includes("wss://")
  ) {
    return true;
  }
  return error instanceof TypeError;
}

export function isLikelyNetworkMessage(message: string): boolean {
  return isLikelyNetworkError(message);
}

export async function probeCallConnectivity(timeoutMs = 4000): Promise<boolean> {
  if (isBrowserOffline()) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch("/api/auth/me", {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok || res.status === 401;
  } catch {
    return false;
  }
}
