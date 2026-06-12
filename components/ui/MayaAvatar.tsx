interface MayaAvatarProps {
  size?: number;
  speaking?: boolean;
  decorative?: boolean;
}

export function MayaAvatar({ size = 72, speaking = false, decorative = false }: MayaAvatarProps) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {decorative && (
        <>
          <span
            style={{
              position: "absolute",
              inset: -14,
              borderRadius: "50%",
              border: "1.5px solid rgba(110, 196, 232, 0.35)",
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: -28,
              borderRadius: "50%",
              border: "1px dashed rgba(61, 184, 158, 0.25)",
              opacity: 0.5,
            }}
          />
        </>
      )}
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
          boxShadow: "0 8px 32px rgba(61, 184, 158, 0.35), inset 0 2px 0 rgba(255,255,255,0.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45), transparent 55%)",
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
            textShadow: "0 1px 8px rgba(30, 51, 48, 0.15)",
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
          boxShadow: "0 0 0 2px rgba(61, 184, 158, 0.25)",
        }}
        aria-hidden
      />
    </div>
  );
}
