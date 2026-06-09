import { NextRequest, NextResponse } from "next/server";
import { getWordExamples, saveWordExamples } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");
  if (!word) return NextResponse.json({ sentences: [] });

  // Check cache — only use if has 4 lines (de1, en1, de2, en2)
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
        system: `You are a German teacher. For the given word produce EXACTLY 4 lines:
Line 1: A German sentence using the word
Line 2: The English translation of line 1
Line 3: Another German sentence using the word
Line 4: The English translation of line 3
Output ONLY these 4 lines. No labels, no numbers, no extra text.`,
        messages: [{ role: "user", content: `Word: "${word}"` }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const lines = text.trim().split("\n").filter((l: string) => l.trim()).slice(0, 4);

    if (lines.length === 4) {
      await saveWordExamples(word, lines);
    }

    return NextResponse.json({ sentences: lines });
  } catch {
    return NextResponse.json({ sentences: [] });
  }
}
