import { NextRequest, NextResponse } from "next/server";
import { getWordExamples, saveWordExamples } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");
  if (!word) return NextResponse.json({ sentences: [] });

  const cached = await getWordExamples(word);
  if (cached && cached.length === 4) {
    return NextResponse.json({ sentences: cached, cached: true });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        stream: false,
        system: `Return ONLY valid JSON. No explanation. No markdown. Just JSON.`,
        messages: [{
          role: "user",
          content: `Create 2 example sentences for the German word "${word}".
Return this exact JSON structure:
{"s1de":"first German sentence","s1en":"English translation","s2de":"second German sentence","s2en":"English translation"}`
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const lines = [parsed.s1de, parsed.s1en, parsed.s2de, parsed.s2en];

    await saveWordExamples(word, lines);
    return NextResponse.json({ sentences: lines });
  } catch {
    return NextResponse.json({ sentences: [] });
  }
}
