/** Strip emojis — ES5-safe (no \p{} property escapes). */
export function stripEmojis(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pass Claude text to Fish with emoji strip only — Fish handles pacing natively. */
export function prepareFishTTS(text: string): string {
  return stripEmojis(text);
}
