"use client";

import Link from "next/link";
import { DecorativeBackground } from "@/components/ui/DecorativeBackground";
import { TabBar } from "@/components/layout/TabBar";

interface ExerciseShellProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  showTabBar?: boolean;
}

/** Keeps exercise flows inside the same 390px mobile frame as the main app. */
export function ExerciseShell({
  children,
  backHref = "/mode",
  backLabel = "←",
  showTabBar = true,
}: ExerciseShellProps) {
  return (
    <div
      className="ui-phone-shell"
      style={{
        position: "relative",
        height: "100dvh",
        maxHeight: "100dvh",
        minHeight: "100dvh",
        maxWidth: 390,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-warm)",
      }}
    >
      <DecorativeBackground />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: showTabBar ? "var(--shell-bottom-tab)" : "var(--shell-bottom)",
        }}
      >
        {children}
      </div>
      {showTabBar && <TabBar />}
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
