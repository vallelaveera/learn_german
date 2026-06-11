import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  setUserFeature,
  getActiveHomework,
  clearActiveHomework,
  getUserFeatures,
} from "@/lib/kv";
import { getHomeworkProgress } from "@/lib/homework";

export const runtime = "nodejs";

function isAdmin(req: NextRequest): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return false;
  const user = verifyToken(token);
  return user?.email?.toLowerCase() === adminEmail.toLowerCase();
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 });

  const [features, assignment] = await Promise.all([
    getUserFeatures(userId),
    getActiveHomework(userId),
  ]);

  const progress = assignment ? getHomeworkProgress(assignment) : null;
  return NextResponse.json({
    homeworkEnabled: features.homeworkEnabled === true,
    assignment,
    progress,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, enabled, action } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (typeof enabled === "boolean") {
      await setUserFeature(userId, "homeworkEnabled", enabled);
    }

    if (action === "clear") {
      await clearActiveHomework(userId);
    }

    const [features, assignment] = await Promise.all([
      getUserFeatures(userId),
      getActiveHomework(userId),
    ]);

    return NextResponse.json({
      ok: true,
      homeworkEnabled: features.homeworkEnabled === true,
      assignment,
      progress: assignment ? getHomeworkProgress(assignment) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
