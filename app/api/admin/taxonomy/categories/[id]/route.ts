import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { loadTaxonomy, softDeleteCategory, updateCategory } from "@/lib/content/taxonomy";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const category = await updateCategory(params.id, {
      labelDe: typeof body.labelDe === "string" ? body.labelDe : undefined,
      labelEn: typeof body.labelEn === "string" ? body.labelEn : undefined,
    });
    const doc = await loadTaxonomy();
    return NextResponse.json({ ok: true, category, updatedAt: doc.updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await softDeleteCategory(params.id);
    const doc = await loadTaxonomy();
    return NextResponse.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
