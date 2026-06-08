import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  // Soniox TTS REST API — returns MP3 audio
  const response = await fetch("https://tts.soniox.com/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model: "tts-v1",
      language: "de", // German
      voice: "de-DE-FemaleA",
      audio_format: "mp3",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Soniox TTS error:", err);
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
