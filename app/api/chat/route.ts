import { NextRequest, NextResponse } from "next/server";
import { TUTOR_SYSTEM_PROMPT } from "@/lib/tutor-prompt";
import { Message } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      system: TUTOR_SYSTEM_PROMPT,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  // Split German reply from English hint
  const lines = text.split("\n").filter(Boolean);
  const hintLine = lines.find((l: string) => l.startsWith("💡"));
  const germanLines = lines.filter((l: string) => !l.startsWith("💡"));

  return NextResponse.json({
    content: germanLines.join(" ").trim(),
    translation: hintLine ? hintLine.replace("💡 ", "") : undefined,
  });
}
