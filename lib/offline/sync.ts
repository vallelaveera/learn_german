import {
  clearOfflineStores,
  getOfflineMeta,
  getOfflineWordCount,
  saveOfflineMeta,
  saveOfflineSentences,
  saveOfflineWords,
} from "./db";
import { OFFLINE_SYNC_INTERVAL_MS } from "./constants";
import type { OfflineBundle } from "./types";

const BUNDLE_URL = "/data/offline/bundle.json";

export async function fetchOfflineBundle(): Promise<OfflineBundle> {
  const res = await fetch(BUNDLE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Offline bundle fetch failed (${res.status})`);
  return res.json() as Promise<OfflineBundle>;
}

export async function installOfflineBundle(bundle: OfflineBundle): Promise<void> {
  await clearOfflineStores();
  await saveOfflineWords(bundle.words);
  await saveOfflineSentences(bundle.sentences);
  await saveOfflineMeta({
    manifestVersion: bundle.manifest.version,
    downloadedAt: Date.now(),
    lastSyncAt: Date.now(),
    wordCount: bundle.words.length,
    sentenceCount: bundle.sentences.length,
  });
}

export async function ensureOfflineContent(force = false): Promise<{
  status: "ready" | "downloaded" | "updated" | "offline-cache";
  wordCount: number;
  sentenceCount: number;
}> {
  const existingCount = await getOfflineWordCount().catch(() => 0);
  const meta = await getOfflineMeta().catch(() => null);

  if (!force && existingCount > 0 && meta) {
    const stale = Date.now() - meta.lastSyncAt > OFFLINE_SYNC_INTERVAL_MS;
    if (!stale) {
      return {
        status: "ready",
        wordCount: meta.wordCount,
        sentenceCount: meta.sentenceCount,
      };
    }
    try {
      const bundle = await fetchOfflineBundle();
      if (bundle.manifest.version > meta.manifestVersion) {
        await installOfflineBundle(bundle);
        return {
          status: "updated",
          wordCount: bundle.words.length,
          sentenceCount: bundle.sentences.length,
        };
      }
      await saveOfflineMeta({ ...meta, lastSyncAt: Date.now() });
      return {
        status: "ready",
        wordCount: meta.wordCount,
        sentenceCount: meta.sentenceCount,
      };
    } catch {
      return {
        status: "offline-cache",
        wordCount: meta.wordCount,
        sentenceCount: meta.sentenceCount,
      };
    }
  }

  const bundle = await fetchOfflineBundle();
  await installOfflineBundle(bundle);
  return {
    status: existingCount > 0 ? "updated" : "downloaded",
    wordCount: bundle.words.length,
    sentenceCount: bundle.sentences.length,
  };
}
