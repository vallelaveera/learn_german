"use client";

import type { OfflineLevel, OfflineWordCategory } from "@/lib/offline/types";
import { OFFLINE_CATEGORY_LABELS, OFFLINE_LEVELS, OFFLINE_LEVEL_COLORS } from "@/lib/offline/constants";

interface OfflineFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  level: OfflineLevel | "all";
  onLevelChange: (level: OfflineLevel | "all") => void;
  category: OfflineWordCategory | "all";
  onCategoryChange: (category: OfflineWordCategory | "all") => void;
  categories: string[];
}

export function OfflineFilterBar({
  search,
  onSearchChange,
  level,
  onLevelChange,
  category,
  onCategoryChange,
  categories,
}: OfflineFilterBarProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <input
        type="search"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Suchen…"
        aria-label="Suchen"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--border-light)",
          background: "#fff",
          fontSize: 16,
          marginBottom: 10,
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }}>
        <FilterChip active={level === "all"} onClick={() => onLevelChange("all")} label="Alle" />
        {OFFLINE_LEVELS.map(l => (
          <FilterChip
            key={l}
            active={level === l}
            onClick={() => onLevelChange(l)}
            label={l}
            color={OFFLINE_LEVEL_COLORS[l]}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        <FilterChip active={category === "all"} onClick={() => onCategoryChange("all")} label="Alle Themen" />
        {categories.map(cat => (
          <FilterChip
            key={cat}
            active={category === cat}
            onClick={() => onCategoryChange(cat as OfflineWordCategory)}
            label={OFFLINE_CATEGORY_LABELS[cat as OfflineWordCategory] ?? cat}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  const accent = color ?? "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        minHeight: 36,
        padding: "6px 12px",
        borderRadius: 999,
        border: active ? `1.5px solid ${accent}` : "1px solid var(--border-light)",
        background: active ? `${accent}18` : "#fff",
        color: active ? accent : "var(--text-muted)",
        fontSize: 12,
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
