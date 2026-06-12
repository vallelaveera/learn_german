interface ActivityIconProps {
  color?: string;
  size?: number;
}

/** Minimal flat icons for home activity cards — single accent color on transparent canvas. */
export function CallActivityIcon({ color = "#FF6B35", size = 28 }: ActivityIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="8" y="4" width="14" height="22" rx="3" stroke={color} strokeWidth="2" />
      <path d="M11 24h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M22 10c2.5 1.2 4 3.6 4 6.5s-1.5 5.3-4 6.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M24 14v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SentencesActivityIcon({ color = "#805AD5", size = 28 }: ActivityIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="12" height="12" rx="2" stroke={color} strokeWidth="2" />
      <rect x="16" y="6" width="12" height="12" rx="2" stroke={color} strokeWidth="2" />
      <rect x="4" y="20" width="12" height="6" rx="2" stroke={color} strokeWidth="2" />
      <rect x="16" y="20" width="12" height="6" rx="2" fill={color} opacity="0.25" />
      <path d="M8 12h4M20 12h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WordsActivityIcon({ color = "#4A90E2", size = 28 }: ActivityIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M8 6h12a3 3 0 0 1 3 3v17l-7.5-4-7.5 4V9a3 3 0 0 1 3-3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 12h6M14 16h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GrammarActivityIcon({ color = "#38A169", size = 28 }: ActivityIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M6 8h14a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V8Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 8V24" stroke={color} strokeWidth="2" />
      <path d="M22 10h4v14h-4" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 14h6M14 18h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
