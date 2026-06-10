import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isUsageAllowed } from "@/lib/kv";
import { TUTOR_SYSTEM_PROMPT } from "@/lib/tutor-prompt";
import { Message } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  if (!(await isUsageAllowed(user.userId))) {
    return new Response(JSON.stringify({ error: "limit_reached" }), { status: 403 });
  }

  const { messages, systemPrompt } = (await req.json()) as {
    messages: Message[];
    systemPrompt?: string;
  };

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
      model: "claude-haiku-4-5",
      max_tokens: 300,
      stream: true,
      system: systemPrompt ?? TUTOR_SYSTEM_PROMPT,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
