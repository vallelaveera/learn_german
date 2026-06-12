import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getActiveHomework,
  skipHomework,
  getHomework,
  getPendingHomeworkList,
  getHomeworkHistoryList,
} from "@/lib/kv";
import {
  isHomeworkEnabledForUser,
  getHomeworkProgress,
  summarizeHomeworkList,
} from "@/lib/homework";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const enabled = await isHomeworkEnabledForUser(user.userId);
    if (!enabled) {
      return NextResponse.json({ enabled: false, assignments: [], assignment: null, summary: null });
    }

    const filter = req.nextUrl.searchParams.get("filter");
    const history = await getHomeworkHistoryList(user.userId);

    if (filter === "completed") {
      return NextResponse.json({
        enabled: true,
        assignments: [],
        assignment: null,
        history,
        summary: summarizeHomeworkList([]),
        progress: null,
      });
    }

    const assignments = await getPendingHomeworkList(user.userId);
    if (!assignments.length) {
      return NextResponse.json({
        enabled: true,
        assignments: [],
        assignment: null,
        history,
        summary: summarizeHomeworkList([]),
        progress: null,
      });
    }

    const assignment = assignments[0];
    const summary = summarizeHomeworkList(assignments);
    const progress = getHomeworkProgress(assignment);
    return NextResponse.json({
      enabled: true,
      assignments,
      assignment,
      history,
      summary,
      progress,
    });
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
      const assignments = await getPendingHomeworkList(user.userId);
      return NextResponse.json({
        ok: true,
        assignment: updated,
        assignments,
        summary: summarizeHomeworkList(assignments),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update homework" }, { status: 500 });
  }
}
