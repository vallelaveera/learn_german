import { playMp3Blob } from "@/lib/audio/play-mp3-element";
import type { Message } from "@/lib/types";

export type CallReplayMode = "user-only" | "full";

let activeAudio: HTMLAudioElement | null = null;
let replaySession = 0;

function haltActiveAudio(): void {
  if (!activeAudio) return;
  try {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  } catch {
    /* ignore */
  }
  activeAudio.onended = null;
  activeAudio.onerror = null;
  activeAudio = null;
}

/** Stop any in-progress call replay (panel, transcript, or sequence). */
export function stopCallReplay(): void {
  replaySession += 1;
  haltActiveAudio();
}

/** Start a new exclusive replay — stops anything already playing. Returns session id. */
export function beginReplaySession(): number {
  stopCallReplay();
  return replaySession;
}

export function isReplaySessionActive(session: number): boolean {
  return session === replaySession;
}

export function userMessagesWithAudio(messages: Message[]): Message[] {
  return messages.filter(m => m.role === "user" && m.audioUrl);
}

export function playAudioUrl(url: string, session: number): Promise<void> {
  haltActiveAudio();

  return new Promise((resolve, reject) => {
    if (session !== replaySession) {
      resolve();
      return;
    }

    const audio = new Audio(url);
    activeAudio = audio;

    const finish = (ok: boolean) => {
      if (activeAudio === audio) activeAudio = null;
      if (session !== replaySession) {
        resolve();
        return;
      }
      if (ok) resolve();
      else reject(new Error("playback failed"));
    };

    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    void audio.play().catch(err => finish(false));
  });
}

export async function playRecordingUrls(urls: string[], session: number): Promise<void> {
  for (const url of urls) {
    if (session !== replaySession) break;
    await playAudioUrl(url, session);
  }
}

export async function replayAssistantLine(text: string, session: number): Promise<void> {
  if (session !== replaySession || !text.trim()) return;

  const res = await fetch("/api/tts-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider: "soniox" }),
  });
  if (session !== replaySession) return;
  if (!res.ok) throw new Error("TTS failed");

  const buffer = await res.arrayBuffer();
  if (session !== replaySession) return;

  const blob = new Blob([buffer], { type: "audio/mpeg" });
  await playMp3Blob(blob, {
    isCancelled: () => session !== replaySession,
  });
}

export async function replayMessages(
  messages: Message[],
  mode: CallReplayMode,
  session: number,
): Promise<void> {
  for (const msg of messages) {
    if (session !== replaySession) break;

    if (msg.role === "user") {
      if (msg.audioUrl) await playAudioUrl(msg.audioUrl, session);
      continue;
    }

    if (mode === "full" && msg.content.trim()) {
      await replayAssistantLine(msg.content.replace(/<end>/g, "").trim(), session);
    }
  }
}

export function revokeMessageAudioUrls(messages: Message[]): void {
  stopCallReplay();
  for (const msg of messages) {
    if (msg.audioUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(msg.audioUrl);
    }
  }
}
