"use client";

import { useState } from "react";
import { COMMON_NATIVE_LANGUAGES } from "@/lib/native-languages";

const OTHER = "Andere";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function NativeLanguageSelect({ value, onChange }: Props) {
  const isOther = value !== "" && !COMMON_NATIVE_LANGUAGES.includes(value as (typeof COMMON_NATIVE_LANGUAGES)[number]);
  const [showOther, setShowOther] = useState(isOther);
  const selectedPreset = showOther ? OTHER : value;

  const selectPreset = (label: string) => {
    if (label === OTHER) {
      setShowOther(true);
      onChange("");
      return;
    }
    setShowOther(false);
    onChange(label);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[...COMMON_NATIVE_LANGUAGES, OTHER].map(label => {
          const active = selectedPreset === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => selectPreset(label)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: active ? "1px solid #7F77DD" : "1px solid var(--border)",
                background: active ? "rgba(127, 119, 221, 0.12)" : "var(--bg)",
                color: active ? "#7F77DD" : "var(--text)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {showOther && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="z.B. Telugu, Bengali, Urdu…"
          autoFocus
          style={{
            width: "100%",
            marginTop: 12,
            padding: "12px 14px",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
            outline: "none",
          }}
        />
      )}
    </div>
  );
}
