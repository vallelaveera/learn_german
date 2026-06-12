/** Soft ambient blobs — glassmorphism backdrop like reference UI */
export function DecorativeBackground() {
  return (
    <div
      aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: 390,
          width: "100%",
          margin: "0 auto",
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
          borderRadius: "inherit",
        }}
    >
      <div className="ui-blob ui-blob-a" />
      <div className="ui-blob ui-blob-b" />
      <div className="ui-blob ui-blob-c" />
      <svg
        viewBox="0 0 390 120"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          bottom: "12%",
          left: 0,
          width: "100%",
          height: 100,
          opacity: 0.45,
        }}
      >
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF9A56" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#FFD166" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 Q97,20 195,55 T390,45 L390,120 L0,120 Z"
          fill="url(#waveGrad)"
        />
      </svg>
    </div>
  );
}
