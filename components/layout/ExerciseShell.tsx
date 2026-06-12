"use client";

import Link from "next/link";
import { DecorativeBackground } from "@/components/ui/DecorativeBackground";

interface ExerciseShellProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

/** Keeps exercise flows inside the same 390px mobile frame as the main app. */
export function ExerciseShell({ children, backHref = "/mode", backLabel = "←" }: ExerciseShellProps) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        maxWidth: 390,
        margin: "0 auto",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <DecorativeBackground />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ExerciseBackLink({ href = "/mode", label = "← Zurück" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--accent)",
        marginBottom: 16,
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}
