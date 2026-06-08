import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateUserFacts } from "@/lib/kv";
import { extractFacts } from "@/lib/memory-agent";
import { Message } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages }: { messages: Message[] } = await req.json();
    if (!messages?.length) return NextResponse.json({ ok: true });

    const newFacts = await extractFacts(messages, user.facts);
    await updateUserFacts(user.userId, newFacts);

    return NextResponse.json({ ok: true, facts: newFacts });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Extract failed" }, { status: 500 });
  }
}
