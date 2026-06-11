"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mode", label: "Home", icon: "🏠" },
  { href: "/progress", label: "Fortschritt", icon: "📈" },
  { href: "/words", label: "Wörter", icon: "📚" },
  { href: "/profile", label: "Profil", icon: "👤" },
] as const;

export function TabBar() {
  const pathname = usePathname();

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
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
