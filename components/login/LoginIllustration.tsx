"use client";

function formatLabelName(raw?: string): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "Du";
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 11)}…`;
}

interface LoginIllustrationProps {
  userName?: string;
}

export function LoginIllustration({ userName }: LoginIllustrationProps) {
  const userLabel = formatLabelName(userName);
  const userFontSize = userLabel.length > 8 ? 9 : 11;

  return (
    <svg
      width="100%"
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
    @keyframes maytalk{
      0%,100%{transform:translateY(0)}
      50%{transform:translateY(-4px)}
    }
    @keyframes userbob{
      0%,100%{transform:translateY(0)}
      50%{transform:translateY(-3px)}
    }
    @keyframes bubble1{
      0%,100%{opacity:1;transform:scale(1)}
      50%{opacity:.7;transform:scale(.96)}
    }
    @keyframes bubble2{
      0%,100%{opacity:1;transform:scale(1)}
      40%{opacity:.7;transform:scale(.96)}
    }
    @keyframes dot1{
      0%,100%{opacity:.3}33%{opacity:1}
    }
    @keyframes dot2{
      0%,100%{opacity:.3}66%{opacity:1}
    }
    @keyframes dot3{
      0%,100%{opacity:.3}100%{opacity:1}
    }
    @keyframes floatde{
      0%,100%{transform:translateY(0);opacity:.8}
      50%{transform:translateY(-6px);opacity:1}
    }
    @keyframes floaten{
      0%,100%{transform:translateY(0);opacity:.6}
      50%{transform:translateY(-5px);opacity:.9}
    }
    .maya-g{
      animation:maytalk 2.5s ease-in-out infinite
    }
    .user-g{
      animation:userbob 3s ease-in-out infinite
    }
    .bub1{
      animation:bubble1 2.5s ease-in-out infinite
    }
    .bub2{
      animation:bubble2 3s ease-in-out infinite .5s
    }
    .floatde{
      animation:floatde 3s ease-in-out infinite
    }
    .floaten{
      animation:floaten 3s ease-in-out infinite .8s
    }
    .d1{animation:dot1 1.2s ease-in-out infinite}
    .d2{animation:dot2 1.2s ease-in-out infinite}
    .d3{animation:dot3 1.2s ease-in-out infinite}
  `}</style>

      <rect width="320" height="200" fill="#EEEDFE" />
      <ellipse cx="160" cy="195" rx="120" ry="20" fill="#CECBF6" opacity=".3" />
      <rect x="0" y="155" width="320" height="50" fill="#CECBF6" opacity=".4" />
      <rect x="0" y="153" width="320" height="6" rx="2" fill="#AFA9EC" opacity=".4" />

      {/* Maya (orange — brand accent) */}
      <g className="maya-g">
        <circle cx="88" cy="82" r="26" fill="#F5C4B3" />
        <rect x="62" y="100" width="52" height="16" rx="8" fill="#F5C4B3" />
        <circle cx="88" cy="58" r="28" fill="#E85A28" />
        <path d="M62 58 Q88 38 114 58" fill="#E85A28" />
        <path d="M60 72 Q88 55 116 72" fill="#E85A28" opacity=".5" />
        <circle cx="88" cy="80" r="24" fill="#F5C5A3" />
        <circle cx="80" cy="76" r="3.5" fill="#2C2C2A" />
        <circle cx="96" cy="76" r="3.5" fill="#2C2C2A" />
        <circle cx="81" cy="75" r="1.2" fill="white" />
        <circle cx="97" cy="75" r="1.2" fill="white" />
        <path
          d="M82 88 Q88 93 94 88"
          fill="none"
          stroke="#C97B5A"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <ellipse cx="78" cy="86" rx="5" ry="3" fill="#F0997B" opacity=".5" />
        <ellipse cx="98" cy="86" rx="5" ry="3" fill="#F0997B" opacity=".5" />
        <rect x="68" y="104" width="40" height="50" rx="10" fill="#FF6B35" />
        <rect x="60" y="114" width="14" height="32" rx="7" fill="#FF6B35" />
        <rect x="106" y="114" width="14" height="32" rx="7" fill="#FF6B35" />
        <rect x="63" y="116" width="10" height="20" rx="5" fill="#E85A28" />
        <rect x="109" y="116" width="10" height="20" rx="5" fill="#E85A28" />
        <rect x="74" y="150" width="14" height="28" rx="7" fill="#E85A28" />
        <rect x="90" y="150" width="14" height="28" rx="7" fill="#E85A28" />
        <rect x="74" y="168" width="14" height="12" rx="4" fill="#C44A1A" />
        <rect x="90" y="168" width="14" height="12" rx="4" fill="#C44A1A" />
        <text
          x="88"
          y="30"
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          fill="#534AB7"
          fontFamily="sans-serif"
        >
          Maya
        </text>
      </g>

      {/* User (purple — tutor contrast) */}
      <g className="user-g">
        <circle cx="232" cy="82" r="26" fill="#F5C4B3" />
        <circle cx="232" cy="58" r="28" fill="#534AB7" />
        <path d="M206 65 Q232 45 258 65" fill="#534AB7" />
        <circle cx="232" cy="80" r="24" fill="#F5C5A3" />
        <circle cx="224" cy="76" r="3.5" fill="#2C2C2A" />
        <circle cx="240" cy="76" r="3.5" fill="#2C2C2A" />
        <circle cx="225" cy="75" r="1.2" fill="white" />
        <circle cx="241" cy="75" r="1.2" fill="white" />
        <path
          d="M226 88 Q232 93 238 88"
          fill="none"
          stroke="#C97B5A"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <ellipse cx="222" cy="86" rx="5" ry="3" fill="#F0997B" opacity=".5" />
        <ellipse cx="242" cy="86" rx="5" ry="3" fill="#F0997B" opacity=".5" />
        <rect x="212" y="104" width="40" height="50" rx="10" fill="#7F77DD" />
        <rect x="204" y="114" width="14" height="32" rx="7" fill="#7F77DD" />
        <rect x="250" y="114" width="14" height="32" rx="7" fill="#7F77DD" />
        <rect x="207" y="116" width="10" height="20" rx="5" fill="#534AB7" />
        <rect x="253" y="116" width="10" height="20" rx="5" fill="#534AB7" />
        <rect x="218" y="150" width="14" height="28" rx="7" fill="#534AB7" />
        <rect x="234" y="150" width="14" height="28" rx="7" fill="#534AB7" />
        <rect x="218" y="168" width="14" height="12" rx="4" fill="#3C3489" />
        <rect x="234" y="168" width="14" height="12" rx="4" fill="#3C3489" />
        <text
          x="232"
          y="30"
          textAnchor="middle"
          fontSize={userFontSize}
          fontWeight="500"
          fill="#E85A28"
          fontFamily="sans-serif"
        >
          {userLabel}
        </text>
      </g>

      {/* Maya speech bubble */}
      <g className="bub1">
        <rect
          x="116"
          y="55"
          width="88"
          height="30"
          rx="10"
          fill="white"
          stroke="#CECBF6"
          strokeWidth="1"
        />
        <path d="M116 68 L108 72 L120 72Z" fill="white" stroke="#CECBF6" strokeWidth="1" />
        <path d="M109 72 L120 72" stroke="white" strokeWidth="2" />
        <text
          x="160"
          y="74"
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill="#534AB7"
          fontFamily="sans-serif"
        >
          Wie geht es dir?
        </text>
      </g>

      {/* User reply bubble — below Maya (outer group positions; inner animates scale only) */}
      <g transform="translate(0, 40)">
        <g className="bub2">
          <rect x="116" y="55" width="88" height="30" rx="10" fill="#7F77DD" />
          <path d="M204 65 L212 60 L204 70Z" fill="#7F77DD" />
          <text
            x="160"
            y="74"
            textAnchor="middle"
            fontSize="10"
            fontWeight="500"
            fill="white"
            fontFamily="sans-serif"
          >
            How are you?
          </text>
        </g>
      </g>

      {/* Floating vocab pills */}
      <g className="floatde">
        <rect x="18" y="50" width="56" height="22" rx="8" fill="#FF6B35" opacity=".9" />
        <text
          x="46"
          y="65"
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill="white"
          fontFamily="sans-serif"
        >
          der Zug
        </text>
      </g>

      <g className="floaten">
        <rect x="246" y="40" width="60" height="22" rx="8" fill="#534AB7" opacity=".9" />
        <text
          x="276"
          y="55"
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill="white"
          fontFamily="sans-serif"
        >
          the train
        </text>
      </g>
    </svg>
  );
}
