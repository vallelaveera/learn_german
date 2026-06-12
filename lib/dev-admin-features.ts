/**
 * Enables dev-only admin tools (illustration batch, etc.) on localhost,
 * Vercel previews, the dev branch, or when ENABLE_ILLUSTRATIONS_ADMIN=true.
 */
export function isDevAdminFeaturesEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.ENABLE_ILLUSTRATIONS_ADMIN === "true") return true;

  const vercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "";
  if (vercelEnv === "preview" || vercelEnv === "development") return true;

  const gitRef =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    "";
  if (gitRef === "dev") return true;

  return false;
}
