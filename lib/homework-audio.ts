import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const MAX_AUDIO_BYTES = 512_000;

function audioKey(
  userId: string,
  homeworkId: string,
  sentenceId: string,
  repIndex: number
): string {
  return `homework:audio:${userId}:${homeworkId}:${sentenceId}:${repIndex}`;
}

export function homeworkAudioPlaybackUrl(
  homeworkId: string,
  sentenceId: string,
  repIndex: number
): string {
  const params = new URLSearchParams({
    homeworkId,
    sentenceId,
    repIndex: String(repIndex),
  });
  return `/api/homework/audio?${params.toString()}`;
}

export async function saveHomeworkAudioRedis(
  userId: string,
  homeworkId: string,
  sentenceId: string,
  repIndex: number,
  data: ArrayBuffer
): Promise<string> {
  if (data.byteLength > MAX_AUDIO_BYTES) {
    throw new Error("Recording too large");
  }
  const b64 = Buffer.from(data).toString("base64");
  await redis.set(audioKey(userId, homeworkId, sentenceId, repIndex), b64);
  return homeworkAudioPlaybackUrl(homeworkId, sentenceId, repIndex);
}

export async function loadHomeworkAudioRedis(
  userId: string,
  homeworkId: string,
  sentenceId: string,
  repIndex: number
): Promise<Buffer | null> {
  const b64 = await redis.get<string>(audioKey(userId, homeworkId, sentenceId, repIndex));
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}
