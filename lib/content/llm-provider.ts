export type AdminLlmProvider = "claude" | "openai";

export const ADMIN_LLM_PROVIDERS: {
  id: AdminLlmProvider;
  label: string;
  model: string;
  envKey: "ANTHROPIC_API_KEY" | "OPENAI_API_KEY";
}[] = [
  {
    id: "claude",
    label: "Claude Haiku 4.5",
    model: "claude-haiku-4-5",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "openai",
    label: "GPT-4o",
    model: "gpt-4o",
    envKey: "OPENAI_API_KEY",
  },
];

export function parseAdminProvider(value: unknown): AdminLlmProvider {
  return value === "openai" ? "openai" : "claude";
}

export function isProviderConfigured(provider: AdminLlmProvider): boolean {
  const meta = ADMIN_LLM_PROVIDERS.find(p => p.id === provider);
  if (!meta) return false;
  return Boolean(process.env[meta.envKey]?.trim());
}

export function getAvailableProviders(): AdminLlmProvider[] {
  return ADMIN_LLM_PROVIDERS.filter(p => isProviderConfigured(p.id)).map(p => p.id);
}

export function providerLabel(provider: AdminLlmProvider): string {
  return ADMIN_LLM_PROVIDERS.find(p => p.id === provider)?.label ?? provider;
}

export function assertProviderConfigured(provider: AdminLlmProvider): void {
  if (!isProviderConfigured(provider)) {
    const meta = ADMIN_LLM_PROVIDERS.find(p => p.id === provider);
    throw new Error(`${providerLabel(provider)} is not configured (${meta?.envKey ?? "API key"} missing)`);
  }
}

async function callClaudeApi(system: string, user: string, maxTokens: number): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: maxTokens,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return (data.content?.[0]?.text ?? "").trim();
}

async function callOpenAiApi(system: string, user: string, maxTokens: number): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

/** Admin content generation — Claude Haiku or GPT-4o. */
export async function callAdminLlm(
  provider: AdminLlmProvider,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  assertProviderConfigured(provider);
  if (provider === "openai") {
    return callOpenAiApi(system, user, maxTokens);
  }
  return callClaudeApi(system, user, maxTokens);
}
