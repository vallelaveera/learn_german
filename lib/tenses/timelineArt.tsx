/** SVG art for the Zeiten verstehen timeline scene (king-story-scene-reference). */

export function FigSvg({ kind, size = 48 }: { kind: "king" | "father" | "kid"; size?: number }) {
  const h = size;
  const w = size * 0.55;
  const skin = "#F4C9A8";
  const robe = { king: "#3C3489", father: "#085041", kid: "#993C1D" } as const;
  const hair = kind === "kid" ? "#5C4033" : "#2C1810";

  return (
    <svg width={w} height={h} viewBox="0 0 28 48" aria-hidden>
      {kind === "king" && (
        <path d="M6 8 L9 2 L14 6 L19 2 L22 8 L22 11 L6 11 Z" fill="#D4AF37" stroke="#9A7B1A" strokeWidth="0.8" />
      )}
      <ellipse cx="14" cy="14" rx="8" ry="9" fill={skin} />
      <ellipse cx="14" cy="12" rx="7" ry="7" fill={hair} opacity={kind === "kid" ? 0.85 : 0.35} />
      <rect x="8" y="22" width="12" height="18" rx="4" fill={robe[kind]} />
      <rect x="6" y="38" width="5" height="10" rx="2" fill={robe[kind]} />
      <rect x="17" y="38" width="5" height="10" rx="2" fill={robe[kind]} />
      {kind === "kid" && <circle cx="14" cy="13" r="1.2" fill="#2C1810" />}
    </svg>
  );
}

export function HorseSvg({ size = 36 }: { size?: number }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 56 40" aria-hidden>
      <ellipse cx="28" cy="32" rx="22" ry="6" fill="rgba(0,0,0,0.08)" />
      <path d="M8 28 Q12 18 22 16 L28 12 Q38 10 46 16 L50 24 Q48 30 40 32 L14 32 Q8 32 8 28Z" fill="#8B5E3C" />
      <path d="M44 14 L52 8 L50 18 Z" fill="#8B5E3C" />
      <rect x="10" y="28" width="4" height="10" rx="1" fill="#6B4423" />
      <rect x="18" y="28" width="4" height="10" rx="1" fill="#6B4423" />
      <rect x="34" y="28" width="4" height="10" rx="1" fill="#6B4423" />
      <rect x="42" y="28" width="4" height="10" rx="1" fill="#6B4423" />
      <circle cx="48" cy="14" r="3" fill="#2C1810" />
    </svg>
  );
}

export function TreeSvg({ size = 44 }: { size?: number }) {
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 24 40" aria-hidden>
      <rect x="10" y="26" width="4" height="14" rx="1" fill="#6B4423" />
      <circle cx="12" cy="18" r="11" fill="#5A944F" />
      <circle cx="8" cy="22" r="7" fill="#7CB66F" opacity="0.85" />
      <circle cx="16" cy="20" r="8" fill="#6BA85E" opacity="0.9" />
    </svg>
  );
}
