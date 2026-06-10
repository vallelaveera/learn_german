export interface Message {
  role: "user" | "assistant";
  content: string;
  translation?: string;
  timestamp: number;
}

export interface UserFacts {
  city?: string;
  job?: string;
  family?: string;
  languages?: string[];
  hobbies?: string[];
  recentFood?: string;
  recentPlans?: string;
  personalDetails?: string[];
  lastUpdated?: number;
  askedTopics?: string[];
  // Onboarding profile fields
  nativeLanguage?: string;
  germanWhy?: string;
  germanLevel?: string;
  interests?: string[];
  occupation?: string; // "student" | "working" | "both"
}

export interface Session {
  id: string;
  userId: string;
  startedAt: number;
  endedAt?: number;
  messages: Message[];
  title?: string;
  newWords?: string[];
  totalUserWords?: number;
  totalMessages?: number;
  extractedFacts?: UserFacts;
  openingContext?: string;
}

export interface VocabWord {
  word: string;
  firstSeen: number;
  timesSeen: number;
  lastSeen: number;
  usedByUser?: boolean;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  nativeLanguage?: string;
  germanLevel?: string;
  createdAt: number;
  lastActiveAt: number;
  streak: number;
  lastCallDate?: number;
  totalSessions: number;
  facts: UserFacts;
}

export interface UserFeatures {
  homeworkEnabled?: boolean;
}

export interface HomeworkSentence {
  id: string;
  text: string;
  userSaid?: string;
  note?: string;
  source: "correction" | "useful";
}

export interface HomeworkRep {
  repIndex: 1 | 2 | 3;
  blobUrl: string;
  transcript?: string;
  recordedAt: number;
}

export interface HomeworkAssignment {
  id: string;
  userId: string;
  sessionId?: string;
  createdAt: number;
  status: "pending" | "completed" | "skipped";
  sentences: HomeworkSentence[];
  progress: Record<string, HomeworkRep[]>;
}
