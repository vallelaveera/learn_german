import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      textAlign: "center",
    }}>
      <p style={{ fontSize: 14, marginBottom: 16, color: "var(--text-muted)" }}>
        Page not found.
      </p>
      <Link href="/login" style={{ fontSize: 13, color: "var(--accent)" }}>
        Go to login
      </Link>
    </div>
  );
}
