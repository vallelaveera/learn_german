import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/kv";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(params.id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await deleteSession(params.id);
  return NextResponse.json({ ok: true });
}
