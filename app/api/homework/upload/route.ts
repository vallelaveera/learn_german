import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthUser } from "@/lib/auth";
import { getHomework, updateHomeworkProgress } from "@/lib/kv";
import { isHomeworkEnabledForUser } from "@/lib/homework";
import { HomeworkRep } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isHomeworkEnabledForUser(user.userId))) {
      return NextResponse.json({ error: "Homework not enabled" }, { status: 403 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Blob storage not configured" }, { status: 503 });
    }

    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const homeworkId = form.get("homeworkId") as string | null;
    const sentenceId = form.get("sentenceId") as string | null;
    const repIndexRaw = form.get("repIndex") as string | null;
    const transcript = (form.get("transcript") as string | null) ?? undefined;

    if (!audio || !homeworkId || !sentenceId || !repIndexRaw) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const repIndex = Number(repIndexRaw) as 1 | 2 | 3;
    if (![1, 2, 3].includes(repIndex)) {
      return NextResponse.json({ error: "Invalid repIndex" }, { status: 400 });
    }

    const assignment = await getHomework(homeworkId);
    if (!assignment || assignment.userId !== user.userId || assignment.status !== "pending") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!assignment.sentences.some(s => s.id === sentenceId)) {
      return NextResponse.json({ error: "Invalid sentence" }, { status: 400 });
    }

    const blob = await put(
      `homework/${user.userId}/${homeworkId}/${sentenceId}-${repIndex}.webm`,
      audio,
      { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN }
    );

    const rep: HomeworkRep = {
      repIndex,
      blobUrl: blob.url,
      transcript,
      recordedAt: Date.now(),
    };

    const updated = await updateHomeworkProgress(homeworkId, sentenceId, rep);
    return NextResponse.json({ ok: true, rep, assignment: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
