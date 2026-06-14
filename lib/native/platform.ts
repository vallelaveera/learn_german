/** True when running inside Capacitor Android/iOS WebView. Safe on server (returns false). */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() ?? false;
}

export function isAndroidNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return cap?.getPlatform?.() === "android";
}

/** MediaRecorder slice interval for Soniox STT uplink — larger on mobile WebView. */
export function getSttMediaRecorderTimesliceMs(): number {
  if (isAndroidNative()) return 400;
  if (isNativePlatform()) return 300;
  return 250;
}
