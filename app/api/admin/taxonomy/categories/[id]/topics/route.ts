import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { addTopic, loadTaxonomy } from "@/lib/content/taxonomy";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const label = typeof body.label === "string" ? body.label : "";
    const topic = await addTopic(params.id, label);
    const doc = await loadTaxonomy();
    return NextResponse.json({ ok: true, topic, updatedAt: doc.updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
