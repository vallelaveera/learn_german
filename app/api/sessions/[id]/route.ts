import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/kv";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(params.id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  const userId = user?.userId ?? "";
  await deleteSession(params.id, userId);
  return NextResponse.json({ ok: true });
}
