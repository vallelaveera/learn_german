export const MAX_GERMAN_WORDS = 8;

export function countGermanWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.replace(/^[„"«']|[»"'"]$/g, "").replace(/[.,!?;:]+$/, ""))
    .filter(word => word.length > 0)
    .length;
}

export function isWithinWordLimit(text: string, max = MAX_GERMAN_WORDS): boolean {
  return countGermanWords(text) <= max;
}
