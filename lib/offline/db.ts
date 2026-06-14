import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
} from "./constants";
import type { OfflineMeta, OfflineSentence, OfflineWord } from "./types";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("words")) {
        db.createObjectStore("words", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sentences")) {
        db.createObjectStore("sentences", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function txStore<T>(
  storeName: "words" | "sentences" | "meta",
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDb().then(
    db =>
      new Promise<T | void>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store);
        tx.oncomplete = () => {
          if (result instanceof IDBRequest) {
            resolve(result.result as T);
          } else {
            resolve();
          }
        };
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      }),
  );
}

export async function clearOfflineStores(): Promise<void> {
  await txStore("words", "readwrite", store => store.clear());
  await txStore("sentences", "readwrite", store => store.clear());
  await txStore("meta", "readwrite", store => store.clear());
}

export async function saveOfflineWords(words: OfflineWord[]): Promise<void> {
  await txStore("words", "readwrite", store => {
    for (const word of words) {
      store.put(word);
    }
  });
}

export async function saveOfflineSentences(sentences: OfflineSentence[]): Promise<void> {
  await txStore("sentences", "readwrite", store => {
    for (const sentence of sentences) {
      store.put(sentence);
    }
  });
}

export async function saveOfflineMeta(meta: OfflineMeta): Promise<void> {
  await txStore("meta", "readwrite", store => {
    store.put({ key: "bundle", ...meta });
  });
}

export async function getOfflineMeta(): Promise<OfflineMeta | null> {
  const row = await txStore<{ key: string } & OfflineMeta>("meta", "readonly", store =>
    store.get("bundle"),
  );
  if (!row || typeof row !== "object") return null;
  const { key: _key, ...meta } = row as { key: string } & OfflineMeta;
  return meta;
}

export async function getAllOfflineWords(): Promise<OfflineWord[]> {
  return (await txStore<OfflineWord[]>("words", "readonly", store => store.getAll())) ?? [];
}

export async function getOfflineWord(id: string): Promise<OfflineWord | undefined> {
  const word = await txStore<OfflineWord | undefined>("words", "readonly", store => store.get(id));
  return word ?? undefined;
}

export async function getAllOfflineSentences(): Promise<OfflineSentence[]> {
  return (await txStore<OfflineSentence[]>("sentences", "readonly", store => store.getAll())) ?? [];
}

export async function getOfflineWordCount(): Promise<number> {
  return (await txStore<number>("words", "readonly", store => store.count())) ?? 0;
}
