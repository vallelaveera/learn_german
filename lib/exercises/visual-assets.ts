import {
  getStoredIllustration,
  isPlaceholderIllustration,
} from "@/lib/content/illustration-storage";
import { resolveIllustrationId } from "@/lib/content/illustration-lookup";
import { getIcon, isValidIconSvg } from "@/lib/vocab/icons";

export async function hasSentenceIllustration(id: string, german: string): Promise<boolean> {
  const illustrationId = resolveIllustrationId(id, german);
  const stored = await getStoredIllustration(illustrationId);
  return stored != null && !isPlaceholderIllustration(stored);
}

/** True when a non-placeholder word icon exists in cache. */
export async function hasWordIcon(german: string): Promise<boolean> {
  const svg = await getIcon(german);
  if (!svg || !isValidIconSvg(svg)) return false;
  // Skip letter-only fallback placeholders (no real icon shapes beyond bg + text).
  if (/font-size="20"/.test(svg) && !/<path\b/i.test(svg) && !/<polygon\b/i.test(svg)) {
    return false;
  }
  return true;
}
