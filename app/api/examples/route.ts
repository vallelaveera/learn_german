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
        stream: true,
        system: `Return ONLY valid JSON. No explanation. No markdown.`,
        messages: [{
          role: "user",
          content: `Create 2 example sentences for the German word "${word}". Return this exact JSON:
{"s1de":"first German sentence","s1en":"English translation","s2de":"second German sentence","s2en":"English translation"}`
        }],
      }),
    });

    // Parse streaming response
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const p = JSON.parse(data);
          if (p.type === "content_block_delta" && p.delta?.type === "text_delta") {
            fullText += p.delta.text;
          }
        } catch {}
      }
    }

    const clean = fullText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const lines = [parsed.s1de, parsed.s1en, parsed.s2de, parsed.s2en];

    await saveWordExamples(word, lines);
    return NextResponse.json({ sentences: lines });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ sentences: [] });
  }
}
