"use client";

import { useRouter } from "next/navigation";
import { getCategoryHref } from "@/lib/grammar/trainer-routes";
import { saveGrammarTier } from "@/lib/grammar/tier-preference";
import type { GrammarCategory, GrammarTier, VerifiedLevel } from "@/lib/grammar/verified-curriculum";

interface GrammarTierToggleProps {
  level: VerifiedLevel;
  category: GrammarCategory;
  tier: GrammarTier;
  color: string;
  light: string;
}

export function GrammarTierToggle({ level, category, tier, color, light }: GrammarTierToggleProps) {
  const router = useRouter();

  const setTier = (next: GrammarTier) => {
    if (next === tier) return;
    saveGrammarTier(level, category, next);
    router.replace(getCategoryHref(level, category, next));
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        padding: 3,
        borderRadius: 10,
        background: "#fff",
        border: `1px solid ${color}33`,
        marginBottom: 14,
      }}
    >
      {(["basic", "advanced"] as const).map(t => {
        const active = tier === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: 8,
              border: "none",
              background: active ? light : "transparent",
              color: active ? color : "var(--text-muted)",
              fontSize: 12,
              fontWeight: active ? 700 : 600,
              cursor: "pointer",
            }}
          >
            {t === "basic" ? "Basic" : "Advanced"}
          </button>
        );
      })}
    </div>
  );
}
