import { NextResponse } from "next/server";
import { getVocab } from "@/lib/kv";

export async function GET() {
  try {
    const words = await getVocab();
    return NextResponse.json({ words });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ words: [] });
  }
}
