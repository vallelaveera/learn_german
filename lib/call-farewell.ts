const FAREWELL_PATTERN =
  /\b(tschüss|tschuss|tschüs|bye\s*bye|bye|auf\s*wiedersehen|bis\s+(bald|später|morgen|dann)|ciao|goodbye|ich\s+muss\s+(gehen|los)|muss\s+los)\b/i;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** True when the user is clearly ending the call (short goodbye utterance). */
export function isFarewellUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!FAREWELL_PATTERN.test(trimmed)) return false;
  if (wordCount(trimmed) > 12) return false;
  return true;
}

export function buildGoodbyePromptSuffix(pendingReps: number): string {
  const backlog =
    pendingReps > 0
      ? `They still have ${pendingReps} Hausaufgaben recording(s) open from earlier calls — remind them briefly to finish in Üben.`
      : "New Hausaufgaben from this call will appear in Üben → Hausaufgaben after the call ends.";

  return `

CALL ENDING — the user said goodbye.
- Give a warm SHORT goodbye (max 2 short German sentences). Do NOT ask another question.
- Tell them to practice Hausaufgaben in the Üben tab (Hausaufgaben section).
- ${backlog}
- Spoken German only for this reply — no 💡 hint lines.`;
}
