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
 * Fish docs: punctuation guides pauses; (break)/(long-break) add natural rhythm.
 * https://docs.fish.audio/developer-guide/core-features/fine-grained-control
 */
export function prepareFishTTS(text: string): string {
  let t = stripEmojis(text);
  if (!t) return t;

  // Claude often joins lines with spaces — restore sentence boundaries
  t = t.replace(/([a-zäöüß])\s+([A-ZÄÖÜ])/g, "$1. $2");

  // Ensure trailing punctuation so Fish doesn't run sentences together
  if (!/[.!?]$/.test(t)) t = t + ".";

  // Fish paralanguage pause tags
  t = t.replace(/([.!?])\s+/g, "$1 (long-break) ");
  t = t.replace(/,\s*/g, ", (break) ");
  t = t.replace(/:\s*/g, ": (break) ");
  t = t.replace(/;\s*/g, "; (break) ");
  t = t.replace(/—\s*/g, "— (break) ");

  // Collapse duplicate tags
  t = t.replace(/\(break\)\s+\(break\)/g, "(break)");
  t = t.replace(/\(long-break\)\s+\(long-break\)/g, "(long-break)");
  t = t.replace(/\(break\)\s+\(long-break\)/g, "(long-break)");
  t = t.replace(/\(long-break\)\s+\(break\)/g, "(long-break)");

  return t.trim();
}
