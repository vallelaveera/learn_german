"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        background: "#F1EFE8",
        color: "#1a1a1a",
      }}>
        <p style={{ fontSize: 14, marginBottom: 16 }}>Something went wrong.</p>
        {process.env.NODE_ENV === "development" && (
          <p style={{ fontSize: 11, color: "#666", marginBottom: 16, maxWidth: 360 }}>
            {error.message}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#7F77DD",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
