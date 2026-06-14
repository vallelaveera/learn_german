"use client";

import type { AdminLlmProvider } from "@/lib/content/llm-provider";

const STORAGE_KEY = "cmd_admin_llm_provider";

export function readStoredProvider(): AdminLlmProvider {
  if (typeof window === "undefined") return "claude";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "openai" ? "openai" : "claude";
}

export function storeProvider(provider: AdminLlmProvider): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, provider);
}

interface ProviderOption {
  id: AdminLlmProvider;
  label: string;
}

interface AdminProviderSelectProps {
  value: AdminLlmProvider;
  onChange: (provider: AdminLlmProvider) => void;
  providers: ProviderOption[];
  disabled?: boolean;
}

export function AdminProviderSelect({
  value,
  onChange,
  providers,
  disabled,
}: AdminProviderSelectProps) {
  if (providers.length <= 1) {
    const only = providers[0];
    return (
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
        Modell: <strong>{only?.label ?? "Claude Haiku 4.5"}</strong>
      </p>
    );
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        KI-Anbieter (Vergleich)
      </span>
      <select
        value={value}
        onChange={e => {
          const next = e.target.value === "openai" ? "openai" : "claude";
          storeProvider(next);
          onChange(next);
        }}
        disabled={disabled}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "0.5px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 14,
          fontFamily: "var(--font-mono)",
        }}
      >
        {providers.map(p => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
