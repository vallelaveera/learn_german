import { Message, UserFacts, UserProfile } from "./types";

// Extract personal facts from a conversation using Claude
export async function extractFacts(
  messages: Message[],
  existingFacts: UserFacts
): Promise<UserFacts> {
  const conversation = messages
    .map((m) => `${m.role === "user" ? "User" : "Felix"}: ${m.content}`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: `Extract personal facts from this German learning conversation.
Return ONLY valid JSON with these fields (omit fields if not mentioned):
{
  "city": "city they live in",
  "job": "their job/profession",
  "family": "family details mentioned",
  "languages": ["languages they speak"],
  "hobbies": ["hobbies mentioned"],
  "recentFood": "food they cooked or ate recently",
  "recentPlans": "upcoming plans they mentioned",
  "personalDetails": ["any other personal facts worth remembering"]
}
Only include facts explicitly mentioned. Return {} if nothing new found.`,
      messages: [
        {
          role: "user",
          content: `Existing facts: ${JSON.stringify(existingFacts)}\n\nConversation:\n${conversation}`,
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const newFacts = JSON.parse(clean);
    return { ...existingFacts, ...newFacts, lastUpdated: Date.now() };
  } catch {
    return existingFacts;
  }
}

// Generate a personalized opening for Felix based on user context
export async function generateOpening(
  profile: UserProfile,
  daysSinceLastCall: number,
  unpracticedWords: string[],
  recentTopics: string[]
): Promise<string> {
  const strategies: string[] = [];

  if (daysSinceLastCall >= 3) {
    strategies.push(
      `User hasn't called in ${daysSinceLastCall} days. Warmly ask why, make them feel missed like a good friend would.`
    );
  }

  if (unpracticedWords.length > 0) {
    strategies.push(
      `Naturally use 1-2 of these words in your opening: ${unpracticedWords.slice(0, 3).join(", ")}`
    );
  }

  if (profile.facts.recentFood) {
    strategies.push(
      `Ask about their food: they mentioned "${profile.facts.recentFood}" recently. Did they cook it again? Was it good?`
    );
  }

  if (profile.facts.family) {
    strategies.push(`Ask about their family: ${profile.facts.family}`);
  }

  if (profile.streak > 0 && profile.streak % 7 === 0) {
    strategies.push(
      `Celebrate their ${profile.streak}-day streak warmly!`
    );
  }

  if (recentTopics.length > 0) {
    strategies.push(
      `Follow up on recent topics: ${recentTopics.join(", ")}`
    );
  }

  // Add random friendship questions
  const friendQuestions = [
    "Ask how to say something German in their native language",
    "Ask what they did last weekend",
    "Ask about their day at work",
    "Ask if they tried something new recently",
  ];
  strategies.push(
    friendQuestions[Math.floor(Math.random() * friendQuestions.length)]
  );

  const strategy = strategies.slice(0, 2).join(". ");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      system: `You are Felix, a close German friend of the user — like a university roommate. 
You speak German together as your thing.
User facts: ${JSON.stringify(profile.facts)}
User name: ${profile.name}
Their German level: ${profile.germanLevel ?? "B1/B2"}
Total sessions together: ${profile.totalSessions}

Generate ONE natural German opening sentence or two short sentences.
Be warm, personal, specific — like a real friend.
NOT a teacher greeting. Reference something real from their life.
Keep it under 40 words. End with a question.`,
      messages: [
        {
          role: "user",
          content: `Opening strategy: ${strategy}`,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text ?? "Hallo! Schön, dass du wieder da bist! Wie läuft es?";
}

// Build the full system prompt with user context
export function buildSystemPrompt(
  profile: UserProfile,
  daysSinceLastCall: number,
  unpracticedWords: string[]
): string {
  const facts = profile.facts;
  const factLines = [
    facts.city && `Lives in ${facts.city}`,
    facts.job && `Works as ${facts.job}`,
    facts.family && `Family: ${facts.family}`,
    facts.recentFood && `Recently cooked/ate: ${facts.recentFood}`,
    facts.recentPlans && `Upcoming plans: ${facts.recentPlans}`,
    facts.personalDetails?.length &&
      `Other details: ${facts.personalDetails.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are Felix — ${profile.name}'s close German friend, like a university roommate.
You've known each other for a long time. You speak German together because that's your thing.

What you know about ${profile.name}:
${factLines || "Still getting to know them"}

Days since last call: ${daysSinceLastCall === 999 ? "first time" : daysSinceLastCall}
Their German level: ${profile.germanLevel ?? "B1/B2"}
Sessions together: ${profile.totalSessions}
${unpracticedWords.length > 0 ? `Words to practice naturally: ${unpracticedWords.join(", ")}` : ""}

RULES:
1. Always respond in German. Keep it conversational, 2-4 sentences max.
2. You are a FRIEND, not a teacher. Correct gently by modeling the right form naturally.
3. Reference their life naturally — ask about their family, food, work, plans.
4. If they haven't called in 3+ days, mention it warmly.
5. Weave unpracticed words into conversation naturally.
6. After your German reply, add "💡 " with a brief English hint only if you used something advanced.
7. Ask follow-up questions to keep conversation going.
8. Remember everything. You are their friend who genuinely cares.`;
}
