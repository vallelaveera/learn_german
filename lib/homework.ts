import { getUserFeatures } from "./kv";
import { HomeworkAssignment } from "./types";

/** Homework is on for everyone unless HOMEWORK_ENABLED=false on the server. */
export function isHomeworkGloballyEnabled(): boolean {
  return process.env.HOMEWORK_ENABLED !== "false";
}

export async function isHomeworkEnabledForUser(userId: string): Promise<boolean> {
  if (!isHomeworkGloballyEnabled()) return false;
  const features = await getUserFeatures(userId);
  if (features.homeworkEnabled === false) return false;
  return true;
}

export function getHomeworkProgress(assignment: HomeworkAssignment): {
  completedReps: number;
  totalReps: number;
  completedSentences: number;
} {
  const totalReps = assignment.sentences.length * 3;
  let completedReps = 0;
  let completedSentences = 0;

  for (const sentence of assignment.sentences) {
    const reps = assignment.progress[sentence.id] ?? [];
    completedReps += reps.length;
    if (reps.length >= 3) completedSentences += 1;
  }

  return { completedReps, totalReps, completedSentences };
}

export function isHomeworkComplete(assignment: HomeworkAssignment): boolean {
  const { completedReps, totalReps } = getHomeworkProgress(assignment);
  return completedReps >= totalReps && totalReps > 0;
}

export interface HomeworkSummary {
  pendingCount: number;
  remainingReps: number;
  totalReps: number;
  completedReps: number;
}

export function summarizeHomeworkList(assignments: HomeworkAssignment[]): HomeworkSummary {
  let totalReps = 0;
  let completedReps = 0;
  for (const assignment of assignments) {
    const p = getHomeworkProgress(assignment);
    totalReps += p.totalReps;
    completedReps += p.completedReps;
  }
  return {
    pendingCount: assignments.length,
    remainingReps: totalReps - completedReps,
    totalReps,
    completedReps,
  };
}
