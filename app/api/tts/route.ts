import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { text, language = "de" } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const lang = language === "en" ? "en" : "de";

  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) {
    console.error("[tts] SONIOX_API_KEY not configured");
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const response = await fetch("https://tts-rt.soniox.com/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.trim(),
      model: "tts-rt-v1",
      language: lang,
      voice: "Maya",
      audio_format: "mp3",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[tts] Soniox error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }

  const audioBuffer = await response.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
