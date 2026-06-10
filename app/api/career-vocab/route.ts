import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getCareerVocabProgress } from "@/lib/kv";
import { buildCareerVocabReport, type CareerVocabEntryStatus } from "@/lib/career-vocab/report";
import type { CareerVocabCategoryId } from "@/lib/career-vocab/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_IDS = new Set<string>([
  "technical",
  "ai_ml",
  "work_actions",
  "job_profile",
  "benefits",
  "workplace",
  "common_work",
]);

const STATUS_IDS = new Set<string>(["used", "exposed", "unused"]);

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = req.nextUrl.searchParams;
    const category = params.get("category") ?? undefined;
    const industry = params.get("industry") ?? undefined;
    const status = params.get("status") ?? undefined;

    if (category && !CATEGORY_IDS.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (status && !STATUS_IDS.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const progress = await getCareerVocabProgress(user.userId);
    const report = buildCareerVocabReport(progress, {
      category: category as CareerVocabCategoryId | undefined,
      industry,
      status: status as CareerVocabEntryStatus | undefined,
    });

    return NextResponse.json(report);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Career vocab report failed" }, { status: 500 });
  }
}
