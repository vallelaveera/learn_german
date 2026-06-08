import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getVocab } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ words: [] });
    const words = await getVocab(user.userId);
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json({ words: [] });
  }
}
