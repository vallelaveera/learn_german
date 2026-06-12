function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Put items with visuals first (still shuffled within each tier). */
export async function prioritizeWithVisuals<T>(
  entries: T[],
  hasVisual: (entry: T) => Promise<boolean>,
): Promise<T[]> {
  if (entries.length <= 1) return entries;

  const scored = await Promise.all(
    entries.map(async entry => ({ entry, hasVisual: await hasVisual(entry) })),
  );

  const illustrated = shuffle(scored.filter(s => s.hasVisual).map(s => s.entry));
  const plain = shuffle(scored.filter(s => !s.hasVisual).map(s => s.entry));
  return [...illustrated, ...plain];
}

export { shuffle };
