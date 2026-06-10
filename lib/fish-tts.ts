/** Strip emojis — ES5-safe (no \p{} property escapes). */
export function stripEmojis(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prepare German text for Fish Audio cloned voice.
 * Fish uses punctuation for natural pauses — no paralanguage tags needed.
 */
export function prepareFishTTS(text: string): string {
  let t = stripEmojis(text);
  if (!t) return t;

  // Claude often joins lines with spaces — restore sentence boundaries
  t = t.replace(/([a-zäöüß])\s+([A-ZÄÖÜ])/g, "$1. $2");

  // Normalize spacing around punctuation
  t = t.replace(/\s+([,.!?;:])/g, "$1");
  t = t.replace(/([,.!?;:])([^\s])/g, "$1 $2");

  // Ensure trailing punctuation so Fish doesn't run sentences together
  if (!/[.!?]$/.test(t)) t = t + ".";

  return t.trim();
}
