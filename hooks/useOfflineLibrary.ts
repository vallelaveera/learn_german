"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllOfflineSentences, getAllOfflineWords, getOfflineMeta } from "@/lib/offline/db";
import { ensureOfflineContent } from "@/lib/offline/sync";
import type { OfflineMeta, OfflineSentence, OfflineWord } from "@/lib/offline/types";

export function useOfflineLibrary() {
  const [words, setWords] = useState<OfflineWord[]>([]);
  const [sentences, setSentences] = useState<OfflineSentence[]>([]);
  const [meta, setMeta] = useState<OfflineMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const refreshFromDb = useCallback(async () => {
    const [w, s, m] = await Promise.all([
      getAllOfflineWords(),
      getAllOfflineSentences(),
      getOfflineMeta(),
    ]);
    setWords(w);
    setSentences(s);
    setMeta(m);
  }, []);

  const bootstrap = useCallback(async (force = false) => {
    setSyncing(true);
    setError(null);
    try {
      const result = await ensureOfflineContent(force);
      setSyncStatus(result.status);
      await refreshFromDb();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download fehlgeschlagen");
      try {
        await refreshFromDb();
      } catch {
        // ignore
      }
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [refreshFromDb]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const categories = useMemo(() => {
    const set = new Set(words.map(w => w.category));
    return Array.from(set).sort();
  }, [words]);

  return {
    words,
    sentences,
    meta,
    categories,
    loading,
    syncing,
    error,
    syncStatus,
    bootstrap,
    refreshFromDb,
    isReady: words.length > 0,
  };
}
