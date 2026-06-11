import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { loadTaxonomy, softDeleteTopic, updateTopic } from "@/lib/content/taxonomy";

export const runtime = "nodejs";

type RouteContext = { params: { id: string; topicId: string } };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const topic = await updateTopic(params.id, params.topicId, {
      label: typeof body.label === "string" ? body.label : undefined,
    });
    const doc = await loadTaxonomy();
    return NextResponse.json({ ok: true, topic, updatedAt: doc.updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await softDeleteTopic(params.id, params.topicId);
    const doc = await loadTaxonomy();
    return NextResponse.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
