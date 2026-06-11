/** True when Vercel Blob is usable via read-write token or OIDC (store + deployment token). */
export function isBlobStorageConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return !!(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN);
}
