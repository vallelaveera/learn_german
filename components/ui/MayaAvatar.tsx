interface MayaAvatarProps {
  size?: number;
  speaking?: boolean;
}

export function MayaAvatar({ size = 72, speaking = false }: MayaAvatarProps) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {speaking && (
        <span
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            border: "2px solid var(--accent-dim)",
            animation: "pulse-ring 1.4s ease-out infinite",
          }}
        />
      )}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 55%)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: size * 0.42,
            fontWeight: 400,
            color: "#fff",
            lineHeight: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          M
        </span>
      </div>
      <span
        style={{
          position: "absolute",
          bottom: 2,
          right: 2,
          width: size * 0.22,
          height: size * 0.22,
          minWidth: 14,
          minHeight: 14,
          borderRadius: "50%",
          background: "var(--green)",
          border: "2.5px solid var(--bg)",
          boxShadow: "0 0 0 1px rgba(34,160,107,0.3)",
        }}
        aria-hidden
      />
    </div>
  );
}
