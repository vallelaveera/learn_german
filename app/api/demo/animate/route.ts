import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an SVG animation expert for a German language learning app.

Create an animated SVG that illustrates a German grammar correction.

STRICT RULES:
- viewBox must be exactly: 0 0 400 200
- Use ONLY these colors:
  #7F77DD (purple primary)
  #534AB7 (purple dark)
  #EEEDFE (purple light)
  #EF9F27 (amber for wrong/error)
  #1D9E75 (green for correct)
  #F1EFE8 (background)
  #888780 (gray neutral)
  white
- Use CSS animations inside a <style> tag within the SVG
- The animation must loop infinitely
- Show the WRONG version with a strikethrough or red-ish amber color
- Show the CORRECT version highlighted in green
- Include a simple illustrative element that relates to the sentence meaning
- Keep it simple — max 15 SVG elements
- Output ONLY raw SVG. No markdown. No backticks.
- Start directly with <svg
- End with </svg>`;

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

interface AnimateRequest {
  wrong?: string;
  correct?: string;
  rule?: string;
  translation?: string;
}

function animHash(wrong: string, correct: string): string {
  return Buffer.from(wrong + correct).toString("base64").slice(0, 16);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fallbackSvg(wrong: string, correct: string, rule: string): string {
  return `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <style>
    @keyframes fadeCorrect {
      0%, 40% { opacity: 0.2; }
      60%, 100% { opacity: 1; }
    }
    .wrong { text-decoration: line-through; }
  </style>
  <rect width="400" height="200" fill="#F1EFE8" rx="12"/>
  <text x="20" y="55" fill="#EF9F27" font-size="13" font-family="sans-serif" class="wrong">${escapeXml(wrong)}</text>
  <text x="20" y="95" fill="#1D9E75" font-size="13" font-family="sans-serif" style="animation: fadeCorrect 2.5s ease-in-out infinite">${escapeXml(correct)}</text>
  <text x="20" y="145" fill="#888780" font-size="11" font-family="sans-serif">${escapeXml(rule)}</text>
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

function isValidAnimatedSvg(svg: string): boolean {
  const trimmed = svg.trim();
  if (!trimmed.startsWith("<svg")) return false;
  if (!trimmed.endsWith("</svg>")) return false;
  if (!/<animate\b/i.test(trimmed) && !/@keyframes/i.test(trimmed)) return false;
  return true;
}

async function callClaude(
  wrong: string,
  correct: string,
  rule: string,
  translation: string,
): Promise<string> {
  const userPrompt = `Create an animated SVG correction card for:

Wrong: ${wrong}
Correct: ${correct}
Grammar rule: ${rule}
English meaning: ${translation}

Show the wrong sentence crossing out and the correct sentence appearing.
Add a small simple illustration related to the meaning.
Keep it clean and minimal.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return (data.content?.[0]?.text ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnimateRequest;
    const wrong = body.wrong?.trim();
    const correct = body.correct?.trim();
    const rule = body.rule?.trim() ?? "";
    const translation = body.translation?.trim() ?? "";

    if (!wrong || !correct) {
      return NextResponse.json({ error: "wrong and correct are required" }, { status: 400 });
    }

    const hash = animHash(wrong, correct);
    const redisKey = `uv:anim:${hash}`;

    try {
      const cached = await redis.get<string>(redisKey);
      if (cached) {
        const svg = typeof cached === "string" ? cached : String(cached);
        return NextResponse.json({ svg, cached: true, hash });
      }
    } catch (err) {
      console.error("Animation cache read failed:", hash, err);
    }

    let svg: string;
    try {
      const raw = await callClaude(wrong, correct, rule, translation);
      const extracted = extractSvg(raw);
      svg = isValidAnimatedSvg(extracted)
        ? extracted
        : fallbackSvg(wrong, correct, rule);
    } catch (err) {
      console.error("Animation generation failed:", hash, err);
      svg = fallbackSvg(wrong, correct, rule);
    }

    try {
      await redis.set(redisKey, svg);
    } catch (err) {
      console.error("Animation cache write failed:", hash, err);
    }

    return NextResponse.json({ svg, cached: false, hash });
  } catch (e) {
    console.error("Demo animate POST failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
