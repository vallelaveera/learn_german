import type { VocabCategory } from "@/lib/vocab/types";

export const CATEGORY_TOPICS: Record<VocabCategory, string[]> = {
  career: [
    "job interview",
    "writing a CV",
    "salary negotiation",
    "first day at work",
    "team meeting",
    "giving feedback",
    "asking for a promotion",
    "remote work",
    "job application",
  ],
  travel: [
    "at the airport",
    "booking a hotel",
    "on the train",
    "asking for directions",
    "at customs",
    "car rental",
    "tourist information",
    "lost luggage",
  ],
  food: [
    "at a restaurant",
    "ordering coffee",
    "at the supermarket",
    "cooking at home",
    "dietary requirements",
    "paying the bill",
  ],
  health: [
    "at the doctor",
    "at the pharmacy",
    "describing symptoms",
    "making an appointment",
    "health insurance",
  ],
  housing: [
    "flat viewing",
    "talking to landlord",
    "moving in",
    "utility bills",
    "neighbours",
    "repairs",
  ],
  daily_life: [
    "morning routine",
    "shopping",
    "at the post office",
    "banking",
    "at the gym",
    "making plans with friends",
  ],
  finance: [
    "opening a bank account",
    "paying taxes",
    "health insurance",
    "sending money abroad",
  ],
  transport: [
    "buying a ticket",
    "delayed train",
    "taxi",
    "public transport",
    "driving licence",
  ],
  social: [
    "meeting someone new",
    "small talk at work",
    "inviting someone",
    "apologising",
    "giving compliments",
  ],
};

export const VOCAB_CATEGORIES = Object.keys(CATEGORY_TOPICS) as VocabCategory[];
