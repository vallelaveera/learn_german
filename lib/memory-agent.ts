import { Message, UserFacts, UserProfile, HomeworkSentence } from "./types";
import { v4 as uuidv4 } from "uuid";
import {
  buildBeginnerSpeechBlock,
  buildHintLanguageBlock,
  resolveNativeLanguage,
} from "./native-languages";

const ASKED_QUESTIONS_CAP = 100;
const ASKED_QUESTIONS_PROMPT_LIMIT = 35;

/** UI-driven confirmations — not conversational questions; don't store or block. */
const SKIP_ASKED_QUESTIONS = new Set([
  "bist du fertig?",
  "meinst du das so?",
]);

function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

function questionKey(q: string): string {
  return normalizeQuestion(q).toLowerCase();
}

/** Merge question lists, dedupe case-insensitively, keep newest up to cap. */
export function mergeAskedQuestions(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...existing, ...incoming]) {
    const q = normalizeQuestion(raw);
    const key = questionKey(q);
    if (!q || seen.has(key) || SKIP_ASKED_QUESTIONS.has(key)) continue;
    seen.add(key);
    merged.push(q);
  }
  return merged.slice(-ASKED_QUESTIONS_CAP);
}

function stripHints(text: string): string {
  const idx = text.indexOf("💡");
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

/** Pull German questions from Maya messages (session end — no API call). */
export function extractAskedQuestionsFromMessages(messages: Message[]): string[] {
  const found: string[] = [];

  for (const m of messages) {
    if (m.role !== "assistant") continue;
    const text = stripHints(m.content);
    const chunks = text.split("?");

    for (let i = 0; i < chunks.length - 1; i++) {
      const fragment = chunks[i].split(/[.!]\s+/).pop()?.trim() ?? "";
      const question = normalizeQuestion(`${fragment}?`);
      const key = questionKey(question);
      if (question.length < 10 || SKIP_ASKED_QUESTIONS.has(key)) continue;
      found.push(question);
    }
  }

  return mergeAskedQuestions([], found);
}

function formatAskedQuestionsBlock(questions: string[]): string {
  if (!questions.length) return "";
  const recent = questions.slice(-ASKED_QUESTIONS_PROMPT_LIMIT);
  return `QUESTIONS ALREADY ASKED — never repeat these or close paraphrases:\n${recent.map(q => `- ${q}`).join("\n")}`;
}

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

  // Do not ask about food or family in opening — Maya will do that naturally in conversation

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
  const askedQuestions = profile.facts.askedQuestions ?? [];
  const askedBlock = formatAskedQuestionsBlock(askedQuestions);

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

Generate ONE short warm German greeting. Max 12 words total.
Friendly hi + ONE short question (max 8 words) using the opening strategy below.
No emojis. Spoken aloud — keep it brief.
The question must be NEW — not in the list below and not a close paraphrase.
${askedBlock || "No prior questions yet — pick any friendly opener."}`,
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
export function buildOnboardingPrompt(
  userName: string,
  missingFields: string[] = [],
  options: { nativeLanguage?: string; germanLevel?: string } = {},
): string {
  const { nativeLanguage, germanLevel } = options;
  const hintBlock = buildHintLanguageBlock(germanLevel, nativeLanguage);
  const speechBlock = buildBeginnerSpeechBlock(germanLevel);
  const nativeKnown = nativeLanguage
    ? `Learner's native language: ${nativeLanguage} (already known — do NOT ask again).`
    : "";

  return `You are Maya — ${userName}'s new personal German tutor and friend.
This is your FIRST conversation with ${userName}.
${nativeKnown}

Your goal in this conversation:
1. Warmly introduce yourself in simple German (A1/A2 level)
2. Ask questions to get to know them — ONE at a time
3. Learn: their job/studies, why they want to learn German, their hobbies${nativeLanguage ? "" : ", their native language"}
4. Keep the conversation going with follow-up questions — never wrap up or imply the call is ending

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
${nativeLanguage ? "" : "- Welche Sprache sprichst du zu Hause?\n"}

RULES:
- Speak simple German — A1/A2 level
- Ask ONE question at a time
- Be warm and friendly like a new friend
- NEVER say goodbye or suggest ending the call (no "Bis dann", "Ich rufe dich morgen an", "bis später", etc.) — always end with a follow-up question
- Speak ONLY German. Never switch to English mid-sentence.
${speechBlock}
${hintBlock}
- No emojis in spoken German
- ONE short question only — never stack affirmation + explanation + question`;
}

type ProfileLike = Pick<UserProfile, "facts" | "nativeLanguage">;

export function isProfileComplete(profile: ProfileLike): boolean {
  const facts = profile.facts;
  return !!(
    facts.occupation &&
    facts.germanWhy &&
    facts.interests?.length &&
    resolveNativeLanguage(profile)
  );
}

export function getMissingFields(profile: ProfileLike): string[] {
  const facts = profile.facts;
  const missing = [];
  if (!facts.occupation) missing.push("job_or_study");
  if (!facts.germanWhy) missing.push("why_learning_german");
  if (!facts.interests?.length) missing.push("hobbies_interests");
  if (!resolveNativeLanguage(profile)) missing.push("native_language");
  return missing;
}

export function buildOnboardingOpening(userName: string): string {
  return `Hallo ${userName}! Ich bin Maya — deine neue Deutschfreundin. Ich rufe dich jeden Tag an und wir üben zusammen Deutsch, ganz entspannt. Aber zuerst — bist du Student oder berufstätig?`;
}

export async function generateHomework(
  messages: Message[],
  germanLevel?: string
): Promise<HomeworkSentence[]> {
  const userTurns = messages.filter(m => m.role === "user").length;
  if (userTurns === 0) return [];

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
      max_tokens: 800,
      system: `Extract homework sentences from this German learning conversation.
Return ONLY valid JSON:
{
  "sentences": [
    {
      "text": "correct German sentence to practice",
      "userSaid": "what the user said wrong (optional)",
      "note": "brief English hint why to practice this (optional)",
      "source": "correction" or "useful"
    }
  ]
}

Rules:
- Return exactly 5 sentences if possible
- Prefer "correction" sentences where the user made grammar/pronunciation mistakes and Maya modeled the correct form
- If fewer than 5 corrections, fill with "useful" sentences — key phrases from the conversation worth repeating
- Each "text" must be a natural German sentence at ${germanLevel ?? "B1/B2"} level, max 15 words
- Never invent mistakes — only use what appears in the transcript`,
      messages: [{ role: "user", content: conversation }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '{"sentences":[]}';
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const raw = Array.isArray(parsed.sentences) ? parsed.sentences : [];
    const sentences: HomeworkSentence[] = raw.slice(0, 5).map((s: {
      text?: string;
      userSaid?: string;
      note?: string;
      source?: string;
    }) => ({
      id: uuidv4(),
      text: String(s.text ?? "").trim(),
      userSaid: s.userSaid ? String(s.userSaid).trim() : undefined,
      note: s.note ? String(s.note).trim() : undefined,
      source: s.source === "correction" ? "correction" : "useful",
    })).filter((s: HomeworkSentence) => s.text.length > 0);

    // Pad with useful Maya phrases if needed
    if (sentences.length < 5) {
      const mayaLines = messages
        .filter(m => m.role === "assistant")
        .map(m => m.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length >= 10 && s.length <= 80))
        .flat();
      for (const line of mayaLines) {
        if (sentences.length >= 5) break;
        if (sentences.some(s => s.text.toLowerCase() === line.toLowerCase())) continue;
        sentences.push({ id: uuidv4(), text: line, source: "useful" });
      }
    }

    return sentences.slice(0, 5);
  } catch {
    return [];
  }
}

export async function generateHomeworkNagOpening(
  name: string,
  pendingCount: number
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      system: `You are Maya, a playful German friend. Generate ONE short German greeting.
User has ${pendingCount} homework recordings still to do.
Tone: warm, friendly, lightly teasing — like "do your homework or I won't talk to you" but clearly a joke between friends.
Max 25 words. Mention Hausaufgaben. End inviting them to chat anyway.`,
      messages: [{ role: "user", content: `User name: ${name}` }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text ??
    `Hey ${name}! Deine Hausaufgaben warten noch — ${pendingCount} Aufnahmen offen. Mach sie bald, sonst rede ich nicht mit dir! 😄`;
}

export function buildSystemPrompt(
  profile: UserProfile,
  daysSinceLastCall: number,
  unpracticedWords: string[],
  homeworkNagActive = false
): string {
  const facts = profile.facts;
  const level = profile.germanLevel ?? facts.germanLevel;
  const nativeLanguage = resolveNativeLanguage(profile);
  const hintBlock = buildHintLanguageBlock(level, nativeLanguage);
  const speechBlock = buildBeginnerSpeechBlock(level);
  // GDPR: Personal details commented out — only keep language learning context
  // GDPR: Only learning-related facts, no personal life details
  const factLines = [
    facts.occupation && `Occupation: ${facts.occupation}`,
    facts.germanWhy && `Learning German for: ${facts.germanWhy}`,
    facts.interests?.length && `Interests: ${facts.interests.join(", ")}`,
    nativeLanguage && `Native language: ${nativeLanguage}`,
  ]
    .filter(Boolean)
    .join("\n");

  const askedTopics = facts.askedTopics ?? [];
  const askedQuestions = facts.askedQuestions ?? [];
  const askedTopicsBlock = askedTopics.length
    ? `TOPICS ALREADY COVERED — pick a different angle: ${askedTopics.slice(-20).join(", ")}`
    : "";
  const askedQuestionsBlock = formatAskedQuestionsBlock(askedQuestions);

  const spokenOutput = speechBlock
    ? `SPOKEN OUTPUT (this is read aloud — brevity is critical):${speechBlock}`
    : `SPOKEN OUTPUT (this is read aloud — brevity is critical):
- Max 2 SHORT sentences. Max ~20 German words per reply.
- Structure: [brief reaction, 3-8 words] + [ONE short question, max 10 words].
- NEVER combine long affirmation + explanation + question in one reply.
- No emojis in the German spoken text.
- Simple vocabulary unless the learner's level is B1+.`;

  return `You are Maya — ${profile.name}'s close German friend, like a university roommate.
You've known each other for a long time. You speak German together because that's your thing.

What you know about ${profile.name}:
${factLines || "Still getting to know them"}

Days since last call: ${daysSinceLastCall === 999 ? "first time" : daysSinceLastCall}
Their German level: ${level ?? "B1/B2"}
Sessions together: ${profile.totalSessions}
${unpracticedWords.length > 0 ? `Words to practice naturally: ${unpracticedWords.join(", ")}` : ""}
${askedTopicsBlock}
${askedQuestionsBlock}

${spokenOutput}

RULES:
1. Always respond in German. Conversational and brief — like a phone call, not an essay.
2. You are a FRIEND, not a teacher. When their German was wrong, model the correct form in one short spoken phrase — never lecture.
3. If they haven't called in 3+ days, one short "schön dich zu hören" — then one question.
4. Weave unpracticed words in naturally — one word per reply max.
5. After your German reply, add separate 💡 lines (not spoken):
${hintBlock.split("\n").slice(1).map(line => `   ${line}`).join("\n")}
   - Never skip Korrektur when their sentence was clearly wrong.
6. Ask ONE follow-up question per reply — each must be a NEW angle, short and direct.
7. NEVER repeat a question from the lists above or one you already asked in this call.
8. NEVER say goodbye or imply the call is over unless the user clearly wants to stop.
${homeworkNagActive ? "9. User has pending homework — mention it once warmly at the start, then continue normal conversation if they want to chat about something else. Do not refuse to talk." : ""}
${homeworkNagActive ? "10" : "9"}. Remember everything. You are their friend who genuinely cares.`;
}
