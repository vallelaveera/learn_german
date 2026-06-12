"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      textAlign: "center",
      background: "var(--bg, #fff)",
      color: "var(--text, #111)",
    }}>
      <p style={{ fontSize: 14, marginBottom: 16 }}>Something went wrong.</p>
      {process.env.NODE_ENV === "development" && (
        <p style={{ fontSize: 11, color: "var(--text-muted, #666)", marginBottom: 16, maxWidth: 360 }}>
          {error.message}
        </p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="ui-btn-primary"
        style={{ fontSize: 13 }}
      >
        Try again
      </button>
    </div>
  );
}
