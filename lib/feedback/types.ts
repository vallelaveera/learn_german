export type FeedbackSource = "post_call" | "profile" | "home";

export interface UserFeedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  wouldUseAgain: number;
  message: string;
  source: FeedbackSource;
  callMode?: string;
  sessionId?: string;
  createdAt: number;
}

export interface SubmitFeedbackPayload {
  rating: number;
  wouldUseAgain: number;
  message: string;
  source: FeedbackSource;
  callMode?: string;
  sessionId?: string;
}

export const BETA_WELCOME_STORAGE_KEY = "cmd_beta_welcome_seen";
