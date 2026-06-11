import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserProfile, saveUserProfile } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { name, germanLevel } = await req.json();
    const profile = await getUserProfile(user.userId);
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (name) profile.name = name;
    if (germanLevel) {
      profile.germanLevel = germanLevel;
      profile.facts = {
        ...profile.facts,
        germanLevel,
        levelOnboarded: true,
        lastUpdated: Date.now(),
      };
    }
    await saveUserProfile(profile);
    return NextResponse.json({ ok: true, user: profile });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
