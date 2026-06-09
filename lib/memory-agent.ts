import { Message, UserFacts, UserProfile } from "./types";

// Extract profile facts from onboarding conversation
export async function extractProfileFacts(
  messages: import("./types").Message[],
  existingFacts: import("./types").UserFacts
): Promise<Partial<import("./types").UserFacts>> {
  const conversation = messages
    .map(m => `${m.role === "user" ? "User" : "Maya"}: ${m.content}`)
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
      max_tokens: 300,
      system: `Extract profile information from this conversation. Return ONLY valid JSON.
Fields to extract (only if clearly mentioned):
{
  "occupation": "student" or "working" or "both",
  "job": "their job title or field of study",
  "germanWhy": "why they are learning German",
  "interests": ["hobby1", "hobby2"],
  "nativeLanguage": "their native language",
  "city": "city they live in"
}
Return {} if nothing found. Never guess.`,
      messages: [{
        role: "user",
        content: `Existing facts: ${JSON.stringify(existingFacts)}

Conversation:
${conversation}`
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";
  try {
    const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

// Extract topics Maya asked about in this session
export async function extractAskedTopics(
  messages: import("./types").Message[]
): Promise<string[]> {
  const mayaText = messages
    .filter(m => m.role === "assistant")
    .map(m => m.content)
    .join(" ");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      system: `Extract the main topics that were asked about in Maya's messages.
Return ONLY a JSON array of short topic strings (max 3 words each).
Example: ["biryani", "jobsuche", "wochenende", "kollegen"]
Return [] if nothing significant found.`,
      messages: [{ role: "user", content: mayaText }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "[]";
  try {
    const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

// Extract personal facts from a conversation using Claude
export async function extractFacts(
  messages: Message[],
  existingFacts: UserFacts
): Promise<UserFacts> {
  const conversation = messages
    .map((m) => `${m.role === "user" ? "User" : "Maya"}: ${m.content}`)
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

// Generate a personalized opening for Maya based on user context
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
      system: `You are Maya, a close German friend of the user — like a university roommate. 
You speak German together as your thing.
User facts: ${JSON.stringify(profile.facts)}
User name: ${profile.name}
Their German level: ${profile.germanLevel ?? "B1/B2"}
Total sessions together: ${profile.totalSessions}

Generate ONE short, warm German greeting — like a friendly colleague who knows them.
Simple and natural. Max 20 words. End with one question.
Examples: "Hey Veera! Schön dass du wieder da bist. Wie war dein Tag?"
NOT dramatic, NOT overly excited. Just warm and friendly.`,
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

// Generate 5 personalised topic suggestions based on user profile
export async function generateTopicSuggestions(
  profile: import("./types").UserProfile
): Promise<string[]> {
  const facts = profile.facts;
  const askedTopics = facts.askedTopics ?? [];

  // Full pool of topics
  const pool = [
    "Alltag & Freizeit",
    "Arbeit & Karriere",
    "Einkaufen & Restaurant",
    "Reisen & Urlaub",
    "Familie & Freunde",
    "Nachrichten & Kultur",
    "Smalltalk & Witze",
    "Gesundheit & Sport",
    "Technik & Internet",
    "Essen & Kochen",
    "Wetter & Natur",
    "Filme & Musik",
    "Wochenendpläne",
    "Deutsche Kultur",
    "Träume & Ziele",
  ];

  // Add personalised topics
  const personal: string[] = [];
  if (facts.interests?.length) {
    facts.interests.slice(0, 2).forEach(i => personal.push(`${i} auf Deutsch`));
  }
  if (facts.job) personal.push("Meetings & Präsentationen");
  if (facts.germanWhy?.toLowerCase().includes("arbeit")) {
    personal.push("Vorstellungsgespräch üben");
  }

  // Filter out recently asked topics
  const filtered = [...personal, ...pool].filter(t =>
    !askedTopics.some(asked => t.toLowerCase().includes(asked.toLowerCase()))
  );

  // Shuffle for variety each session
  const shuffled = filtered.sort(() => Math.random() - 0.5);

  return Array.from(new Set(shuffled)).slice(0, 5);
}

// Build the full system prompt with user context
export function buildOnboardingPrompt(userName: string, missingFields: string[] = []): string {
  return `You are Maya — ${userName}'s new personal German tutor and friend.
This is your FIRST conversation with ${userName}.

Your goal in this conversation:
1. Warmly introduce yourself in simple German (A1/A2 level)
2. Ask 4-5 questions to get to know them — ONE at a time
3. Learn: their job/studies, why they want to learn German, their hobbies, their German level
4. After 4-5 exchanges, end warmly and say you will call them tomorrow

Question bank — pick naturally based on conversation flow:
- Bist du Student oder berufstätig?
- Was machst du beruflich?
- In welcher Branche arbeitest du?
- Wo wohnst du gerade?
- Wie lange lernst du schon Deutsch?
- Was ist dein größtes Problem — Sprechen, Grammatik oder Wortschatz?
- Warum möchtest du Deutsch lernen?
- Brauchst du Deutsch für die Arbeit oder privat?
- Was machst du in deiner Freizeit?
- Hast du Familie hier in Deutschland?
- Was ist dein Ziel — fließend sprechen oder nur Grundlagen?
- Hast du deutsche Kollegen oder Freunde?

RULES:
- Speak simple German — A1/A2 level
- Ask ONE question at a time
- Be warm and friendly like a new friend
- After 4-5 questions end with: "Super! Ich rufe dich morgen wieder an. Bis dann! 🎉"
- Speak ONLY German. Never switch to English mid-sentence.
- After your German response, add ONE 💡 hint line in English if needed
- Keep responses short — max 2 sentences`;
}

export function isProfileComplete(facts: import("./types").UserFacts): boolean {
  return !!(
    facts.occupation &&
    facts.germanWhy &&
    facts.interests?.length &&
    facts.nativeLanguage
  );
}

export function getMissingFields(facts: import("./types").UserFacts): string[] {
  const missing = [];
  if (!facts.occupation) missing.push("job_or_study");
  if (!facts.germanWhy) missing.push("why_learning_german");
  if (!facts.interests?.length) missing.push("hobbies_interests");
  if (!facts.nativeLanguage) missing.push("native_language");
  return missing;
}

export function buildOnboardingOpening(userName: string): string {
  return `Hallo ${userName}! Ich bin Maya — deine neue Deutschfreundin. Ich rufe dich jeden Tag an und wir üben zusammen Deutsch, ganz entspannt. Aber zuerst — bist du Student oder berufstätig?`;
}

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

  return `You are Maya — ${profile.name}'s close German friend, like a university roommate.
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
