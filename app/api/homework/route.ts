import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getActiveHomework,
  skipHomework,
  getHomework,
} from "@/lib/kv";
import { isHomeworkEnabledForUser, getHomeworkProgress } from "@/lib/homework";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const enabled = await isHomeworkEnabledForUser(user.userId);
    if (!enabled) {
      return NextResponse.json({ enabled: false, assignment: null });
    }

    const assignment = await getActiveHomework(user.userId);
    if (!assignment) {
      return NextResponse.json({ enabled: true, assignment: null });
    }

    const progress = getHomeworkProgress(assignment);
    return NextResponse.json({ enabled: true, assignment, progress });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load homework" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, homeworkId } = await req.json();
    const id = homeworkId as string | undefined;

    if (action === "skip") {
      const target = id
        ? await getHomework(id)
        : await getActiveHomework(user.userId);
      if (!target || target.userId !== user.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const updated = await skipHomework(target.id);
      return NextResponse.json({ ok: true, assignment: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update homework" }, { status: 500 });
  }
}
