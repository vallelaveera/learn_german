import { NextRequest, NextResponse } from "next/server";
import { getStoredIllustration } from "@/lib/content/illustration-storage";
import { PLACEHOLDER_ILLUSTRATION_SVG } from "@/lib/content/sentence-illustrations";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = decodeURIComponent(params.id);

  try {
    const svg = await getStoredIllustration(id);
    if (svg) {
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (err) {
    console.error("Illustration GET failed:", id, err);
  }

  return new NextResponse(PLACEHOLDER_ILLUSTRATION_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache",
    },
  });
}
