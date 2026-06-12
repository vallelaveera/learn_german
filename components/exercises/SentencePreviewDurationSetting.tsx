"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  DEFAULT_PREVIEW_SECONDS,
  loadPreviewDurationSetting,
  MAX_CUSTOM_PREVIEW_SECONDS,
  MIN_CUSTOM_PREVIEW_SECONDS,
  normalizePreviewSeconds,
  PREVIEW_DURATION_PRESETS,
  previewDurationLabel,
  resolvePreviewSeconds,
  savePreviewDurationSetting,
  type PreviewDurationPreset,
  type SentencePreviewDurationSetting,
} from "@/lib/exercises/sentence-preview-duration";

interface SentencePreviewDurationSettingProps {
  compact?: boolean;
  onChange?: (seconds: number) => void;
}

export function SentencePreviewDurationSetting({
  compact = false,
  onChange,
}: SentencePreviewDurationSettingProps) {
  const [setting, setSetting] = useState<SentencePreviewDurationSetting>(() =>
    defaultSetting(),
  );

  function defaultSetting(): SentencePreviewDurationSetting {
    if (typeof window === "undefined") {
      return { preset: DEFAULT_PREVIEW_SECONDS, customSeconds: 8 };
    }
    return loadPreviewDurationSetting();
  }

  useEffect(() => {
    const loaded = loadPreviewDurationSetting();
    setSetting(loaded);
    onChange?.(resolvePreviewSeconds(loaded));
  }, [onChange]);

  const apply = (next: SentencePreviewDurationSetting) => {
    setSetting(next);
    savePreviewDurationSetting(next);
    onChange?.(resolvePreviewSeconds(next));
  };

  const pickPreset = (preset: PreviewDurationPreset) => {
    apply({ ...setting, preset });
  };

  const activeSeconds = resolvePreviewSeconds(setting);

  return (
    <div
      style={{
        padding: compact ? "10px 12px" : "14px 16px",
        borderRadius: compact ? 12 : 16,
        border: "1px solid var(--border-light)",
        background: compact ? "var(--surface)" : "var(--bg-warm)",
      }}
    >
      <div style={{ marginBottom: compact ? 8 : 10 }}>
        <p
          style={{
            fontSize: compact ? 11 : 12,
            fontWeight: 600,
            color: "var(--text)",
            margin: "0 0 4px",
          }}
        >
          {compact ? "Maya liest vor" : "Wie lange bleibt der Satz sichtbar, während Maya spricht?"}
        </p>
        <p style={{ fontSize: compact ? 10 : 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
          {compact
            ? "Der Satz bleibt so lange auf dem Bildschirm, während Maya ihn vorliest"
            : "Maya liest den Satz vor — er bleibt so lange sichtbar, bevor du ihn aus dem Gedächtnis aufbaust."}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PREVIEW_DURATION_PRESETS.map(sec => {
          const active = setting.preset === sec;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => pickPreset(sec)}
              style={chipStyle(active)}
            >
              {sec} Sek.
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => pickPreset("custom")}
          style={chipStyle(setting.preset === "custom")}
        >
          Eigene
        </button>
      </div>

      {setting.preset === "custom" && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <input
            type="number"
            min={MIN_CUSTOM_PREVIEW_SECONDS}
            max={MAX_CUSTOM_PREVIEW_SECONDS}
            value={setting.customSeconds}
            onChange={e => {
              const customSeconds = normalizePreviewSeconds(Number(e.target.value) || MIN_CUSTOM_PREVIEW_SECONDS);
              apply({ preset: "custom", customSeconds });
            }}
            style={{
              width: 72,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              fontSize: 13,
              color: "var(--text)",
            }}
          />
          Sekunden ({MIN_CUSTOM_PREVIEW_SECONDS}–{MAX_CUSTOM_PREVIEW_SECONDS})
        </label>
      )}

      <p style={{ fontSize: 10, color: "var(--accent)", margin: compact ? "8px 0 0" : "10px 0 0", fontWeight: 600 }}>
        Maya spricht · {previewDurationLabel(activeSeconds)} sichtbar
      </p>
    </div>
  );
}

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    background: active ? "var(--accent-soft)" : "var(--surface)",
    color: active ? "var(--accent)" : "var(--text-muted)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}
