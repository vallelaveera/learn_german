export interface Message {
  role: "user" | "assistant";
  content: string;       // German text
  translation?: string;  // English hint
  timestamp: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  messages: Message[];
  title?: string;        // auto-generated summary
}
