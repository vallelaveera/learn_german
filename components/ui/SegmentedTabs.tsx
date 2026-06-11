import type { ReactNode } from "react";

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
}

export function SegmentedTabs<T extends string>({ tabs, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div
      className="ui-card"
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        marginBottom: 16,
      }}
    >
      {tabs.map(tab => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              border: "none",
              background: active ? "var(--accent-soft)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {tab.icon && (
              <span style={{ display: "flex", opacity: active ? 1 : 0.65 }}>{tab.icon}</span>
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
