import {
  getStoredIllustration,
  isPlaceholderIllustration,
} from "@/lib/content/illustration-storage";
import { resolveIllustrationId, resolveWordIllustrationId } from "@/lib/content/illustration-lookup";
import { getIcon, isValidIconSvg } from "@/lib/vocab/icons";

export async function hasSentenceIllustration(id: string, german: string): Promise<boolean> {
  const illustrationId = resolveIllustrationId(id, german);
  const stored = await getStoredIllustration(illustrationId);
  return stored != null && !isPlaceholderIllustration(stored);
}

/** True when a generated word scene SVG exists (admin batch illustrations). */
export async function hasWordIllustration(entryId: string): Promise<boolean> {
  const illustrationId = resolveWordIllustrationId(entryId);
  const stored = await getStoredIllustration(illustrationId);
  return stored != null && !isPlaceholderIllustration(stored);
}

/** True when a word has a scene SVG or a non-placeholder icon. */
export async function hasWordVisual(entryId: string, german: string): Promise<boolean> {
  if (await hasWordIllustration(entryId)) return true;
  return hasWordIcon(german);
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
