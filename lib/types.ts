export interface Message {
  role: "user" | "assistant";
  content: string;
  translation?: string;
  timestamp: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  messages: Message[];
  title?: string;
  newWords?: string[];
  totalUserWords?: number;
  totalMessages?: number;
}

export interface VocabWord {
  word: string;
  firstSeen: number;
  timesSeen: number;
  lastSeen: number;
}

export interface UserVocab {
  userId: string;
  words: Record<string, VocabWord>;
}
