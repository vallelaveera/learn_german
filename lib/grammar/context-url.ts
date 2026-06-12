export function buildCallContextUrl(
  options: { scenarioId?: string | null; grammarId?: string | null } = {},
): string {
  const params = new URLSearchParams();
  if (options.scenarioId) params.set("scenario", options.scenarioId);
  if (options.grammarId) params.set("grammar", options.grammarId);
  const query = params.toString();
  return query ? `/api/context?${query}` : "/api/context";
}
