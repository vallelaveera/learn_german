import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import type { VocabStatus } from "@/lib/vocab/iconColors";
import { injectColors } from "@/lib/vocab/injectColors";
import { deleteIcon, getOrGenerateIcon } from "@/lib/vocab/icons";

export const runtime = "nodejs";

const VALID_STATUS = new Set<VocabStatus>(["new", "practice", "mastered"]);

function parseStatus(value: string | null): VocabStatus {
  if (value && VALID_STATUS.has(value as VocabStatus)) {
    return value as VocabStatus;
  }
  return "new";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { word: string } },
) {
  try {
    const word = decodeURIComponent(params.word);
    const status = parseStatus(req.nextUrl.searchParams.get("status"));
    const translation = req.nextUrl.searchParams.get("translation") ?? undefined;

    const svg = await getOrGenerateIcon(word, translation);
    const colored = injectColors(svg, status);

    return new NextResponse(colored, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("Icon GET failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { word: string } },
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const word = decodeURIComponent(params.word);
    await deleteIcon(word);
    return NextResponse.json({ deleted: true, word });
  } catch (e) {
    console.error("Icon DELETE failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
