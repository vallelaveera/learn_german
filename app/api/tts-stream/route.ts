import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return new Response("No text", { status: 400 });

  const apiKey = process.env.SONIOX_API_KEY!;

  const soniox = await fetch("https://tts-rt.soniox.com/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model: "tts-rt-v1",
      language: "de",
      voice: "Maya",
      audio_format: "mp3",
    }),
  });

  if (!soniox.ok) {
    const err = await soniox.text();
    console.error("TTS stream error:", err);
    return new Response("TTS failed", { status: 500 });
  }

  // Stream audio chunks directly back to browser as they arrive from Soniox
  return new Response(soniox.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "Transfer-Encoding": "chunked",
    },
  });
}
