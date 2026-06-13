export function splitKeyHighlight(
  key: string,
  hint: string,
): { before: string; highlight: string; after: string; whole: boolean } {
  const tag = hint.split("=")[0]?.trim() ?? "";

  if (tag.startsWith("Ge-") && key.length >= 2 && key.toLowerCase().startsWith("ge")) {
    return { before: "", highlight: key.slice(0, 2), after: key.slice(2), whole: false };
  }

  if (tag.startsWith("-")) {
    const suffix = tag.slice(1);
    if (key.endsWith(suffix)) {
      return {
        before: key.slice(0, key.length - suffix.length),
        highlight: suffix,
        after: "",
        whole: false,
      };
    }
    const idx = key.indexOf(suffix);
    if (idx > 0) {
      return {
        before: key.slice(0, idx),
        highlight: suffix,
        after: key.slice(idx + suffix.length),
        whole: false,
      };
    }
  }

  return { before: "", highlight: key, after: "", whole: true };
}
