/** Rules appended to system prompt when Maya B (Fish) is active in call mode. */
export const FISH_SPOKEN_RULES = `

SPOKEN OUTPUT: Max 2 short sentences, ~20 words total. One short question only. No emojis.
`;

/** Strip emojis — ES5-safe (no \p{} property escapes). */
export function stripEmojis(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .trim();
}

/** Pass Claude text to Fish with emoji strip only — Fish handles pacing natively. */
export function prepareFishTTS(text: string): string {
  return stripEmojis(text);
}
