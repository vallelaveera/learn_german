import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  deletePracticeReport,
  getPracticeReport,
  listPracticeReports,
  savePracticeReport,
} from "@/lib/kv";
import type { PracticeSessionReport } from "@/lib/exercises/session-report-types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ reports: [] });

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const report = await getPracticeReport(user.userId, id);
      if (!report || report.userId !== user.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ report });
    }

    const reports = await listPracticeReports(user.userId, 30);
    return NextResponse.json({ reports });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ reports: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Omit<PracticeSessionReport, "id" | "userId">;
    if (!body?.type || !body?.title || !Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 });
    }

    const report = await savePracticeReport(user.userId, {
      type: body.type,
      category: body.category ?? "",
      title: body.title,
      startedAt: body.startedAt ?? Date.now(),
      endedAt: body.endedAt ?? Date.now(),
      score: body.score ?? 0,
      total: body.total ?? body.items.length,
      items: body.items,
    });

    return NextResponse.json({ report });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await getPracticeReport(user.userId, id);
    if (!existing || existing.userId !== user.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await deletePracticeReport(user.userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
