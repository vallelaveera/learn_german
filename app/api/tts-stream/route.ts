import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { text, provider = "soniox" } = await req.json();
  if (!text) return new Response("No text", { status: 400 });

  if (provider === "fish") {
    console.log("Using Fish Audio TTS");
    // Fish Audio — Maya Natural
    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reference_id: "5d57382c07b0434bb7958aed4cf97757",
        format: "mp3",
        streaming: true,
        latency: "balanced",
        mp3_bitrate: 128,
      }),
    });
    console.log("Fish Audio response status:", res.status);
    if (!res.ok) {
      const err = await res.text();
      console.error("Fish TTS error:", err);
      return new Response("TTS failed", { status: 500 });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Soniox — Maya Classic
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
    console.error("Soniox TTS error:", err);
    return new Response("TTS failed", { status: 500 });
  }
  return new Response(soniox.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}
