/** Hard cap for generated exercise sentences (aim shorter; 10 allows C1/C2 phrasing). */
export const MAX_GERMAN_WORDS = 10;

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
