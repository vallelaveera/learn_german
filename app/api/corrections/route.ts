import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { extractCorrectionsFromMessages } from "@/lib/corrections";
import { getSessionCorrections, saveSessionCorrections } from "@/lib/kv";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionId = req.nextUrl.searchParams.get("session");
    if (!sessionId) return NextResponse.json({ error: "session required" }, { status: 400 });

    const corrections = await getSessionCorrections(user.userId, sessionId);
    return NextResponse.json({ corrections });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, messages } = await req.json() as {
      sessionId: string;
      messages: Message[];
    };
    if (!sessionId || !messages?.length) {
      return NextResponse.json({ corrections: [] });
    }

    const corrections = extractCorrectionsFromMessages(messages, sessionId);
    if (corrections.length) {
      await saveSessionCorrections(user.userId, sessionId, corrections);
    }
    return NextResponse.json({ corrections });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
