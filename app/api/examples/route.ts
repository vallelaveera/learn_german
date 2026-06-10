import { NextRequest, NextResponse } from "next/server";
import { getWordExamples, saveWordExamples } from "@/lib/kv";

export const runtime = "nodejs";

async function callClaude(prompt: string, system: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      stream: true,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

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
      try {
        const p = JSON.parse(line.slice(6).trim());
        if (p.type === "content_block_delta" && p.delta?.type === "text_delta") {
          fullText += p.delta.text;
        }
      } catch {}
    }
  }
  return fullText.trim();
}

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");
  const type = req.nextUrl.searchParams.get("type") ?? "sentences"; // "sentences" or "translations"
  const context = req.nextUrl.searchParams.get("context"); // "career" for workplace examples
  if (!word) return NextResponse.json({ error: "No word" });

  const careerSuffix = context === "career" ? ":career" : "";
  const cacheKey = `${word.toLowerCase()}:${type}${careerSuffix}`;
  const cached = await getWordExamples(cacheKey);
  if (cached) return NextResponse.json({ data: cached, cached: true });

  try {
    let result: string[];

    if (type === "sentences") {
      const isCareer = context === "career";
      const text = await callClaude(
        isCareer
          ? `Give 2 natural German workplace sentences using "${word}" (job interview, office, or professional context). One sentence per line. Only the sentences, nothing else.`
          : `Give 2 natural German sentences using the word "${word}". One sentence per line. Only the sentences, nothing else.`,
        isCareer
          ? "You are a German career coach. Return exactly 2 professional German sentences, one per line. No numbers, no labels, no explanations."
          : "You are a German teacher. Return exactly 2 German sentences, one per line. No numbers, no labels, no explanations."
      );
      result = text.split("\n").filter(Boolean).slice(0, 2);

    } else {
      const sentencesCached = await getWordExamples(`${word.toLowerCase()}:sentences${careerSuffix}`);
      if (!sentencesCached) return NextResponse.json({ data: [] });

      const text = await callClaude(
        `Translate these German sentences to English:\n1. ${sentencesCached[0]}\n2. ${sentencesCached[1]}\nReturn only the 2 translations, one per line.`,
        "You are a translator. Return exactly 2 English translations, one per line. No numbers, no labels."
      );
      result = text.split("\n").filter(Boolean).slice(0, 2);
    }

    if (result.length) await saveWordExamples(cacheKey, result);
    return NextResponse.json({ data: result, cached: false });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ data: [] });
  }
}
