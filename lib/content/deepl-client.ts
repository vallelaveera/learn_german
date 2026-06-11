function getAuthKey(): string {
  const key = process.env.DEEPL_AUTH_KEY?.trim();
  if (!key) throw new Error("DEEPL_AUTH_KEY not configured");
  return key;
}

export function isDeepLConfigured(): boolean {
  return !!process.env.DEEPL_AUTH_KEY?.trim();
}

export function getDeepLBaseUrl(): string {
  if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL.replace(/\/$/, "");
  const key = process.env.DEEPL_AUTH_KEY ?? "";
  return key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
}

export function getDeepLAuditLabel(writeAvailable: boolean): string {
  return writeAvailable ? "DeepL Translate + Write" : "DeepL Translate";
}

async function deeplPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${getDeepLBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      authorization: `DeepL-Auth-Key ${getAuthKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    const error = new Error(`DeepL API error ${response.status}: ${err}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

interface TranslateResponse {
  translations: { text: string; detected_source_language?: string }[];
}

interface WriteResponse {
  improvements: { text: string; target_language?: string; detected_source_language?: string }[];
}

export async function deeplTranslateDeToEn(german: string): Promise<string> {
  const data = await deeplPost<TranslateResponse>("/v2/translate", {
    text: [german],
    source_lang: "DE",
    target_lang: "EN-US",
  });
  return data.translations[0]?.text?.trim() ?? "";
}

/** Pro-only — returns null when Write is unavailable on the current plan. */
export async function deeplCorrectGerman(german: string): Promise<string | null> {
  try {
    const data = await deeplPost<WriteResponse>("/v2/write/correct", {
      text: [german],
      target_lang: "de",
    });
    return data.improvements[0]?.text?.trim() ?? null;
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 403 || status === 404 || status === 451) return null;
    throw e;
  }
}

let writeProbeCache: boolean | null = null;

export async function probeDeepLWrite(): Promise<boolean> {
  if (writeProbeCache !== null) return writeProbeCache;
  try {
    const corrected = await deeplCorrectGerman("das Haus");
    writeProbeCache = corrected !== null;
  } catch {
    writeProbeCache = false;
  }
  return writeProbeCache;
}
