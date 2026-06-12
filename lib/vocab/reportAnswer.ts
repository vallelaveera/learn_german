/** Fire-and-forget: record exercise answer for vocab status tracking. */
export function reportVocabAnswer(wordId: string, correct: boolean): void {
  void fetch("/api/vocab", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateStatus", wordId, correct }),
  }).catch(() => {});
}
