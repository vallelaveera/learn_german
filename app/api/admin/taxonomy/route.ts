import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { addCategory, loadTaxonomy } from "@/lib/content/taxonomy";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await loadTaxonomy();
  return NextResponse.json({
    categories: doc.categories,
    updatedAt: doc.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const category = await addCategory({
      id: typeof body.id === "string" ? body.id : undefined,
      labelDe: body.labelDe ?? "",
      labelEn: typeof body.labelEn === "string" ? body.labelEn : undefined,
      topics: Array.isArray(body.topics) ? body.topics.filter((t: unknown) => typeof t === "string") : undefined,
    });
    const doc = await loadTaxonomy();
    return NextResponse.json({ ok: true, category, updatedAt: doc.updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
