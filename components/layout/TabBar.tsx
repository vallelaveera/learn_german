"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/mode", label: "Home", icon: "🏠" },
  { href: "/progress", label: "Fortschritt", icon: "📈" },
  { href: "/words", label: "Üben", icon: "📚" },
  { href: "/profile", label: "Profil", icon: "👤" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const [homeworkRemaining, setHomeworkRemaining] = useState(0);

  useEffect(() => {
    fetch("/api/homework/status")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.enabled && typeof data.remainingReps === "number") {
          setHomeworkRemaining(data.remainingReps);
        } else {
          setHomeworkRemaining(0);
        }
      })
      .catch(() => setHomeworkRemaining(0));
  }, [pathname]);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 390,
        display: "flex",
        gap: 4,
        padding: "8px 18px calc(env(safe-area-inset-bottom, 0px) + 8px)",
        background: "var(--bg)",
        borderTop: "0.5px solid var(--border)",
        zIndex: 100,
      }}
    >
      {TABS.map(tab => {
        const active = pathname === tab.href || (tab.href === "/mode" && pathname === "/");
        const showBadge = tab.href === "/words" && homeworkRemaining > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minHeight: 44,
              textDecoration: "none",
              color: active ? "#7F77DD" : "var(--text-muted)",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, position: "relative" }}>
              {tab.icon}
              {showBadge && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -10,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 8,
                    background: "#E74C3C",
                    color: "#fff",
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {homeworkRemaining > 99 ? "99+" : homeworkRemaining}
                </span>
              )}
            </span>
            <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
