"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, TrendingUp, BookOpen, User } from "lucide-react";

const TABS = [
  { href: "/mode", label: "Home", Icon: Home },
  { href: "/progress", label: "Fortschritt", Icon: TrendingUp },
  { href: "/words", label: "Üben", Icon: BookOpen },
  { href: "/profile", label: "Profil", Icon: User },
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
        gap: 2,
        padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border-light)",
        boxShadow: "0 -4px 24px rgba(42,32,28,0.06)",
        zIndex: 100,
      }}
    >
      {TABS.map(tab => {
        const active = pathname === tab.href || (tab.href === "/mode" && pathname === "/");
        const showBadge = tab.href === "/words" && homeworkRemaining > 0;
        const Icon = tab.Icon;
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
              gap: 4,
              minHeight: 48,
              textDecoration: "none",
              color: active ? "var(--accent)" : "var(--text-dim)",
              position: "relative",
              borderRadius: 12,
              background: active ? "var(--accent-soft)" : "transparent",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
              {showBadge && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -12,
                    minWidth: 17,
                    height: 17,
                    padding: "0 4px",
                    borderRadius: 9,
                    background: "var(--red)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #fff",
                  }}
                >
                  {homeworkRemaining > 99 ? "99+" : homeworkRemaining}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, letterSpacing: "0.02em" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
