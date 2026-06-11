export function isExerciseEntryExcluded(
  entryId: string,
  german: string,
  excluded: Set<string>
): boolean {
  const g = german.toLowerCase().trim();
  return excluded.has(entryId) || excluded.has(g) || excluded.has(`g:${g}`);
}
