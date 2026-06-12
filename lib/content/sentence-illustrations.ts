import type { BatchSentence } from "./sentences-batch";

export const ILLUSTRATION_MODEL = "claude-haiku-4-5-20251001";

export const PLACEHOLDER_ILLUSTRATION_SVG = `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="160" fill="#F1EFE8"/>
  <circle cx="100" cy="70" r="12" fill="#EEEDFE" stroke="#7F77DD" stroke-width="1.5"/>
  <rect x="88" y="81" width="24" height="20" rx="4" fill="#7F77DD"/>
  <rect x="88" y="98" width="8" height="14" rx="3" fill="#534AB7"/>
  <rect x="104" y="98" width="8" height="14" rx="3" fill="#534AB7"/>
</svg>`;

export const ILLUSTRATION_SYSTEM_PROMPT = `You are a minimal SVG illustrator for a German language learning app.

Create an animated SVG scene for a German sentence. The scene must include a simple character called Maya who has:
- Round head (circle, radius 10-12px)
- Short hair (small arcs above head)
- Purple outfit (rectangle body, color #7F77DD)
- Simple dot eyes
- Small arms and legs
Maya must be doing something related to the sentence meaning.

STRICT RULES:
- viewBox exactly: 0 0 200 160
- Use ONLY these colors:
  #7F77DD  purple (Maya outfit + accents)
  #534AB7  dark purple
  #EEEDFE  light purple
  #F1EFE8  background (warm white)
  #888780  gray
  #5F5E5A  dark gray
  #C0DD97  light green
  #1D9E75  green
  #FAC775  amber/yellow
  #B5D4F4  light blue
  #378ADD  blue
  #2C2C2A  near black
  white
- Include CSS animation with @keyframes
  Animation must loop infinitely
  Keep animation simple — one or two movements
- Flat design. No gradients. No shadows.
- No text inside the SVG at all
- Max 20 SVG elements total
- Output ONLY raw SVG
- Start with <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
- End with </svg>
- Nothing before or after the SVG tags`;

export function illustrationRedisKey(id: string): string {
  return `uv:illus:${id}`;
}

export function extractSvg(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:svg|xml)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = text.indexOf("<svg");
  const end = text.lastIndexOf("</svg>");
  if (start >= 0 && end >= start) {
    return text.slice(start, end + 6);
  }
  return text;
}

function hasAnimation(svg: string): boolean {
  return (
    /<animate\b/i.test(svg) ||
    /@keyframes/i.test(svg) ||
    /animation\s*:/i.test(svg)
  );
}

/** Inject a simple loop if Claude omitted CSS animation. */
export function ensureIllustrationAnimation(svg: string): string {
  if (hasAnimation(svg)) return svg;
  const style =
    "<style>@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}" +
    ".illus-float{animation:float 2.2s ease-in-out infinite;transform-origin:100px 80px;}</style>";
  const inner = svg
    .trim()
    .replace(/^<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
  return `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">${style}<g class="illus-float">${inner}</g></svg>`;
}

export function isValidIllustrationSvg(svg: string): boolean {
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg")) return false;
  if (!trimmed.endsWith("</svg>")) return false;
  if (trimmed.length < 200 || trimmed.length > 8000) return false;
  return true;
}

export function repairTruncatedSvg(svg: string): string | null {
  let trimmed = svg.trim();
  if (!trimmed.startsWith("<svg")) return null;
  if (!trimmed.endsWith("</svg>")) {
    trimmed += "</svg>";
  }
  if (!isValidIllustrationSvg(trimmed)) return null;
  return ensureIllustrationAnimation(trimmed);
}

export function finalizeIllustrationSvg(svg: string): string {
  const trimmed = svg.trim();
  const repaired = repairTruncatedSvg(trimmed);
  if (repaired) return repaired;
  throw new Error(`Invalid SVG (${trimmed.length} chars)`);
}

export function buildIllustrationUserPrompt(sentence: BatchSentence): string {
  return `Create an animated scene for:
German: ${sentence.de}
English: ${sentence.en}
Level: ${sentence.level}
Category: ${sentence.category}

Maya must appear in the scene doing something related to the meaning.
Add a simple looping animation.`;
}

export async function generateIllustrationSvg(sentence: BatchSentence): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ILLUSTRATION_MODEL,
      max_tokens: 2000,
      system: ILLUSTRATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildIllustrationUserPrompt(sentence) }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = (data.content?.[0]?.text ?? "").trim();
  const svg = extractSvg(raw);
  return finalizeIllustrationSvg(svg);
}
