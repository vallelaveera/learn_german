import * as fs from "fs";
import * as path from "path";
import { redis, redisConfigured } from "../redis";
import { illustrationRedisKey, PLACEHOLDER_ILLUSTRATION_SVG } from "./sentence-illustrations";

const LOCAL_DIR = path.join(process.cwd(), "data", "illustrations");

function localPath(id: string): string {
  return path.join(LOCAL_DIR, `${id}.svg`);
}

export function ensureLocalDir(): void {
  if (!fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

export async function getStoredIllustration(id: string): Promise<string | null> {
  const key = illustrationRedisKey(id);

  if (redisConfigured()) {
    try {
      const cached = await redis.get<string>(key);
      if (cached) {
        return typeof cached === "string" ? cached : String(cached);
      }
    } catch (err) {
      console.error("Redis read failed, trying local:", id, err);
    }
  }

  const file = localPath(id);
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, "utf8");
  }

  return null;
}

export async function storeIllustration(id: string, svg: string): Promise<void> {
  ensureLocalDir();
  fs.writeFileSync(localPath(id), svg, "utf8");

  if (!redisConfigured()) return;

  try {
    await redis.set(illustrationRedisKey(id), svg);
  } catch (err) {
    console.error("Redis write failed, kept local copy:", id, err);
  }
}

export function isPlaceholderIllustration(svg: string): boolean {
  return svg.trim() === PLACEHOLDER_ILLUSTRATION_SVG.trim();
}

export async function hasStoredIllustration(id: string): Promise<boolean> {
  const existing = await getStoredIllustration(id);
  return existing != null;
}

export async function needsRegeneration(id: string): Promise<boolean> {
  const existing = await getStoredIllustration(id);
  if (!existing) return true;
  return isPlaceholderIllustration(existing);
}
