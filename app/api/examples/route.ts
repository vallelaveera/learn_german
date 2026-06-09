import { NextRequest, NextResponse } from "next/server";
import { getWordExamples, saveWordExamples } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");
  if (!word) return NextResponse.json({ sentences: [] });

  const cached = await getWordExamples(word);
  if (cached) {
    // Check if cached version has translations (length should be 4: de1, en1, de2, en2)
    if (cached.length === 4) return NextResponse.json({ sentences: cached, cached: true });
    // Old cache without translations — regenerate
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
        system: "You are a German teacher. Respond with EXACTLY 4 lines. Line 1: German sentence. Line 2: English translation of line 1. Line 3: Another German sentence. Line 4: English translation of line 3. No labels, no numbering, nothing else.",
        messages: [{ role: "user", content: `Make 2 example sentences using the German word: "${word}"` }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const lines = text.trim().split("\n").filter(Boolean).slice(0, 4);

    if (lines.length === 4) {
      await saveWordExamples(word, lines);
      return NextResponse.json({ sentences: lines, cached: false });
    }

    return NextResponse.json({ sentences: lines });
  } catch {
    return NextResponse.json({ sentences: [] });
  }
}
