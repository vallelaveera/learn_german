import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getHomework } from "@/lib/kv";
import { loadHomeworkAudioRedis } from "@/lib/homework-audio";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const homeworkId = req.nextUrl.searchParams.get("homeworkId");
    const sentenceId = req.nextUrl.searchParams.get("sentenceId");
    const repIndexRaw = req.nextUrl.searchParams.get("repIndex");
    if (!homeworkId || !sentenceId || !repIndexRaw) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const repIndex = Number(repIndexRaw);
    if (![1, 2, 3].includes(repIndex)) {
      return NextResponse.json({ error: "Invalid repIndex" }, { status: 400 });
    }

    const assignment = await getHomework(homeworkId);
    if (!assignment || assignment.userId !== user.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const audio = await loadHomeworkAudioRedis(user.userId, homeworkId, sentenceId, repIndex);
    if (!audio) {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/webm",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load audio" }, { status: 500 });
  }
}
