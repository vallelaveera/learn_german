import type { Message } from "@/lib/types";

export type CallReplayMode = "user-only" | "full";

export function userMessagesWithAudio(messages: Message[]): Message[] {
  return messages.filter(m => m.role === "user" && m.audioUrl);
}

export function playAudioUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("playback failed"));
    void audio.play().catch(reject);
  });
}

export async function playRecordingUrls(urls: string[]): Promise<void> {
  for (const url of urls) {
    await playAudioUrl(url);
  }
}

export async function replayAssistantLine(text: string): Promise<void> {
  const res = await fetch("/api/tts-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider: "soniox" }),
  });
  if (!res.ok) throw new Error("TTS failed");
  const buffer = await res.arrayBuffer();
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  try {
    await playAudioUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function replayMessages(
  messages: Message[],
  mode: CallReplayMode,
): Promise<void> {
  for (const msg of messages) {
    if (msg.role === "user") {
      if (msg.audioUrl) await playAudioUrl(msg.audioUrl);
      continue;
    }
    if (mode === "full" && msg.content.trim()) {
      await replayAssistantLine(msg.content.replace(/<end>/g, "").trim());
    }
  }
}

export function revokeMessageAudioUrls(messages: Message[]): void {
  for (const msg of messages) {
    if (msg.audioUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(msg.audioUrl);
    }
  }
}
