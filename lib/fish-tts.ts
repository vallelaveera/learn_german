/** Rules appended to system prompt when Maya B (Fish) is active in call mode. */
export const FISH_SPOKEN_RULES = `

SPOKEN OUTPUT (voice — follow strictly):
- No emojis in the German speech (💡 hint line only, on its own line)
- Max 2 short sentences per reply
- Each sentence must end with . ! or ?
- One idea per sentence — do not pack multiple thoughts into one long sentence
`;

/** Strip emojis — ES5-safe (no \p{} property escapes). */
export function stripEmojis(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .trim();
}

/**
 * Format Claude text for Fish TTS — emoji-free with clear sentence boundaries.
 * Fish pauses on . ! ? so each thought gets breathing room without slowing speech.
 */
export function prepareFishTTS(text: string): string {
  let t = stripEmojis(text);
  if (!t) return t;

  t = t.replace(/\s+/g, " ").trim();

  const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const parts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    line = line.replace(/([a-zäöüß])\s+([A-ZÄÖÜ])/g, "$1. $2");
    if (!/[.!?]$/.test(line)) line = line + ".";
    parts.push(line);
  }

  return parts.join(" ");
}
