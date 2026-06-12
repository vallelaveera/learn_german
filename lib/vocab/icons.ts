import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const ICON_SYSTEM_PROMPT = `You are an SVG icon designer for a German language learning app. Create a minimal flat SVG icon.

STRICT RULES:
- viewBox must be exactly: 0 0 48 48
- Use ONLY these placeholder colors in the SVG:
  PRIMARY: #7F77DD
  LIGHT: #EEEDFE
  DARK: #534AB7
- Flat design only. No gradients. No shadows. No text.
- Maximum 8 SVG elements total
- Icon must be instantly recognizable at 48x48
- For abstract concepts: use a simple metaphor
  (Zierlichkeit → delicate flower)
  (Verantwortung → person with shield)
  (Nachhaltigkeit → leaf or tree)
- Output ONLY raw SVG. No markdown. No backticks.
- Start with <svg viewBox="0 0 48 48"
- End with </svg>
- Nothing before or after the SVG tags`;

const SHAPE_PATTERN = /<(rect|circle|ellipse|path|polygon|polyline|line)\b/i;

function iconRedisKey(iconKey: string): string {
  return `uv:icon:${iconKey}`;
}

/** Strip article, normalize umlauts, lowercase — stable cache key per German word. */
export function cleanWordKey(germanWord: string): string {
  let s = germanWord.trim();
  s = s.replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/i, "");
  s = s
    .replace(/ü/g, "ue")
    .replace(/Ü/g, "ue")
    .replace(/ä/g, "ae")
    .replace(/Ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/Ö/g, "oe")
    .replace(/ß/g, "ss");
  s = s.toLowerCase().trim();
  s = s.replace(/[^a-z0-9-]+/g, "");
  return s;
}

function firstLetterForPlaceholder(germanWord: string): string {
  const cleaned = cleanWordKey(germanWord);
  const letter = cleaned.charAt(0).toUpperCase();
  return letter || "?";
}

export function placeholderIconSvg(germanWord: string): string {
  const letter = firstLetterForPlaceholder(germanWord);
  return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="40" height="40" rx="8" fill="#EEEDFE"/>
  <text x="24" y="30" text-anchor="middle" font-size="20" font-weight="500" fill="#7F77DD" font-family="sans-serif">${letter}</text>
</svg>`;
}

function extractSvg(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:svg|xml)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = text.indexOf("<svg");
  const end = text.lastIndexOf("</svg>");
  if (start >= 0 && end >= start) {
    return text.slice(start, end + 6);
  }
  return text;
}

export function isValidIconSvg(svg: string): boolean {
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg")) return false;
  if (!trimmed.endsWith("</svg>")) return false;
  if (!/viewBox\s*=/i.test(trimmed)) return false;
  if (!SHAPE_PATTERN.test(trimmed)) return false;
  return true;
}

async function callClaudeForIcon(germanWord: string, englishTranslation?: string): Promise<string> {
  const userMessage = `Create a 48x48 SVG icon for: ${germanWord}
English meaning: ${englishTranslation?.trim() || "unknown"}
Use #7F77DD as primary color, #EEEDFE as light.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: ICON_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return (data.content?.[0]?.text ?? "").trim();
}

async function generateIconSvg(
  germanWord: string,
  englishTranslation?: string,
): Promise<string> {
  try {
    const raw = await callClaudeForIcon(germanWord, englishTranslation);
    const svg = extractSvg(raw);
    if (isValidIconSvg(svg)) return svg;
  } catch (err) {
    console.error("Icon generation failed:", cleanWordKey(germanWord), err);
  }
  return placeholderIconSvg(germanWord);
}

/** Redis lookup only — no Claude call. */
export async function getIcon(germanWord: string): Promise<string | null> {
  const iconKey = cleanWordKey(germanWord);
  if (!iconKey) return null;
  const cached = await redis.get<string>(iconRedisKey(iconKey));
  if (!cached) return null;
  return typeof cached === "string" ? cached : String(cached);
}

/** Remove cached icon so the next GET regenerates. */
export async function deleteIcon(germanWord: string): Promise<void> {
  const iconKey = cleanWordKey(germanWord);
  if (!iconKey) return;
  await redis.del(iconRedisKey(iconKey));
}

/** Cache hit returns immediately; otherwise generates once and stores permanently. */
export async function getOrGenerateIcon(
  germanWord: string,
  englishTranslation?: string,
): Promise<string> {
  const iconKey = cleanWordKey(germanWord);
  if (!iconKey) {
    return placeholderIconSvg(germanWord);
  }

  const cached = await redis.get<string>(iconRedisKey(iconKey));
  if (cached) {
    console.log("Icon cache hit:", iconKey);
    return typeof cached === "string" ? cached : String(cached);
  }

  const svg = await generateIconSvg(germanWord, englishTranslation);
  await redis.set(iconRedisKey(iconKey), svg);
  console.log("Icon generated:", iconKey);
  return svg;
}
