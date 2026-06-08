import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { text, provider = "soniox" } = await req.json();
  if (!text) return new Response("No text", { status: 400 });

  if (provider === "fish") {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reference_id: process.env.FISH_AUDIO_VOICE_ID,
        format: "mp3",
        streaming: true,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("Fish Audio error:", err);
      return new Response("Fish Audio TTS failed", { status: 500 });
    }
    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  }

  // Soniox (default)
  const response = await fetch("https://tts-rt.soniox.com/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
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
  if (!response.ok) {
    const err = await response.text();
    console.error("Soniox TTS error:", err);
    return new Response("Soniox TTS failed", { status: 500 });
  }
  return new Response(response.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
