import { HomeworkAssignment } from "./types";
import { getUserFeatures } from "./kv";

export function isHomeworkGloballyEnabled(): boolean {
  return process.env.HOMEWORK_ENABLED === "true";
}

export async function isHomeworkEnabledForUser(userId: string): Promise<boolean> {
  if (!isHomeworkGloballyEnabled()) return false;
  const features = await getUserFeatures(userId);
  return features.homeworkEnabled === true;
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
