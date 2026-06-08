import { NextRequest, NextResponse } from "next/server";
import { findOrCreateUser, createToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const profile = await findOrCreateUser(
      email.toLowerCase().trim(),
      name ?? email.split("@")[0]
    );

    const token = createToken(profile.userId, profile.email);

    const res = NextResponse.json({ ok: true, user: profile });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
