export type GenderArticle = "der" | "die" | "das";
export type GenderTab = "practice" | "patterns" | "sort" | "progress";

export interface GenderRule {
  tag: string;
  note: string;
  examples: string[];
}

export interface GenderPattern {
  article: GenderArticle;
  character: string;
  frameParts: string[];
  keys: string[];
  decoys: string[];
  hints: string[];
  rules: GenderRule[];
}

export interface GenderNoun {
  id: string;
  emoji: string;
  word: string;
  article: GenderArticle;
}

export interface GenderRoundStats {
  correct: number;
  total: number;
}

export interface GenderStats {
  der: GenderRoundStats;
  die: GenderRoundStats;
  das: GenderRoundStats;
  learned: string[];
}

export interface GenderAchievements {
  sentenceGraduate: boolean;
  wordCollector: boolean;
  genderMaster: boolean;
  sortStreak: boolean;
}

export interface GermanGenderState {
  xp: number;
  graduated: boolean;
  sentenceCorrect: number;
  sentenceTotal: number;
  roundNum: number;
  stats: GenderStats;
  achievements: GenderAchievements;
  streak: number;
  sortStreak: number;
  graduationDismissed: boolean;
}

export const GENDER_ORDER: GenderArticle[] = ["der", "die", "das"];

export const GENDER_LABEL: Record<GenderArticle, string> = {
  der: "der",
  die: "die",
  das: "das",
};

export const GENDER_CHARACTER: Record<GenderArticle, string> = {
  der: "The King",
  die: "The Queen",
  das: "The little one",
};
