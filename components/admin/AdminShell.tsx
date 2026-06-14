"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const PURPLE = "#7F77DD";

const MAIN_TABS: { href: string; label: string; prefix: string; exact?: boolean; devOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard", prefix: "/admin", exact: true },
  { href: "/admin/content", label: "Inhalt", prefix: "/admin/content" },
  { href: "/admin/generate", label: "Generieren", prefix: "/admin/generate" },
  { href: "/admin/grammar", label: "Grammatik", prefix: "/admin/grammar" },
  { href: "/admin/illustrations", label: "Illustrationen", prefix: "/admin/illustrations" },
  { href: "/admin/feedback", label: "Feedback", prefix: "/admin/feedback" },
];

function isTabActive(pathname: string, tab: (typeof MAIN_TABS)[number]) {
  if (tab.exact) {
    return pathname === "/admin" || pathname === "/admin/";
  }
  return pathname.startsWith(tab.prefix);
}

interface AdminShellProps {
  children: ReactNode;
  title?: string;
  backHref?: string;
  backLabel?: string;
}

export function AdminShell({ children, title, backHref, backLabel }: AdminShellProps) {
  const pathname = usePathname() ?? "";
  const onUserDetail = pathname.startsWith("/admin/user");

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, #7F77DD 8%) 100%)",
      paddingTop: "var(--sat)",
      paddingBottom: "var(--sab)",
    }}>
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "0.5px solid var(--border)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 8px",
          maxWidth: 960,
          margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {backHref ? (
              <Link href={backHref} style={{
                fontSize: 11,
                color: PURPLE,
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}>
                ← {backLabel ?? "Zurück"}
              </Link>
            ) : (
              <>
                <span style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 10,
                  fontWeight: 700,
                  background: PURPLE,
                  color: "#fff",
                  padding: "3px 7px",
                  borderRadius: 4,
                  letterSpacing: "0.08em",
                }}>
                  ADMIN
                </span>
                <span style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  fontWeight: 300,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {title ?? "CallMeDaily"}
                </span>
              </>
            )}
          </div>
          <Link href="/mode" style={{
            fontSize: 11,
            color: "var(--text-muted)",
            border: "0.5px solid var(--border)",
            padding: "6px 12px",
            borderRadius: 8,
            textDecoration: "none",
            background: "var(--surface)",
            flexShrink: 0,
          }}>
            App
          </Link>
        </div>

        {!onUserDetail && (
          <nav style={{
            display: "flex",
            gap: 6,
            padding: "0 16px 10px",
            maxWidth: 960,
            margin: "0 auto",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}>
            {MAIN_TABS.map(tab => {
              const active = isTabActive(pathname, tab);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    fontWeight: active ? 600 : 400,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    color: active ? "#fff" : "var(--text-muted)",
                    background: active ? PURPLE : "var(--surface)",
                    border: active ? "none" : "0.5px solid var(--border)",
                    boxShadow: active ? "0 2px 8px rgba(127, 119, 221, 0.35)" : "none",
                    transition: "background 0.15s ease",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "16px", paddingBottom: "calc(32px + var(--sab, 0px))" }}>
        {children}
      </main>
    </div>
  );
}

interface AdminSubTabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function AdminSubTabs({ tabs, active, onChange }: AdminSubTabsProps) {
  return (
    <div style={{
      display: "flex",
      gap: 4,
      padding: 4,
      background: "var(--surface)",
      border: "0.5px solid var(--border)",
      borderRadius: 12,
      marginBottom: 16,
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              minHeight: 40,
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              color: isActive ? PURPLE : "var(--text-muted)",
              background: isActive ? "color-mix(in srgb, #7F77DD 12%, var(--bg))" : "transparent",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "0.5px solid var(--border)",
      borderRadius: 12,
      padding: "16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

export function AdminStatGrid({ stats }: { stats: { label: string; value: number | string; accent?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
      {stats.map(s => (
        <AdminCard key={s.label} style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            {s.label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, color: s.accent ?? PURPLE, fontFamily: "var(--font-mono)" }}>
            {s.value}
          </div>
        </AdminCard>
      ))}
    </div>
  );
}
