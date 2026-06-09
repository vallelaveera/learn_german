import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Examples are in Redis as examples:word keys
  // They will regenerate automatically when accessed
  return NextResponse.json({ ok: true, message: "Examples will regenerate on next access" });
}
