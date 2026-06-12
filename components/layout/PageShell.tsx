"use client";
import { TabBar } from "./TabBar";
import { DecorativeBackground } from "@/components/ui/DecorativeBackground";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  showTabBar?: boolean;
  headerRight?: React.ReactNode;
  /** Top bar with only headerRight (e.g. level chip on home) */
  minimalHeader?: boolean;
  /** Lock main area height so content fits one screen (no scroll). */
  fitViewport?: boolean;
}

export function PageShell({ children, title, showTabBar = true, headerRight, minimalHeader = false, fitViewport = false }: PageShellProps) {
  return (
    <div
      className="ui-phone-shell"
      style={{
        position: "relative",
        minHeight: "100dvh",
        background: "var(--bg-warm)",
        maxWidth: 390,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DecorativeBackground />
      {(title || minimalHeader) && (
        <header
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: minimalHeader && !title ? "flex-end" : "space-between",
            padding: "14px 18px",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
            borderBottom: minimalHeader && !title ? "none" : "1px solid rgba(255, 255, 255, 0.4)",
            background: minimalHeader && !title ? "transparent" : "rgba(255, 255, 255, 0.55)",
            backdropFilter: minimalHeader && !title ? "none" : "blur(16px)",
            WebkitBackdropFilter: minimalHeader && !title ? "none" : "blur(16px)",
            flexShrink: 0,
            minHeight: minimalHeader && !title ? 48 : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {title && (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 11,
                    fontWeight: 600,
                    background: "var(--gradient)",
                    color: "#fff",
                    padding: "4px 9px",
                    borderRadius: 10,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  DE
                </span>
                <span className="ui-title-serif" style={{ fontSize: 18 }}>
                  {title}
                </span>
              </>
            )}
          </div>
          {headerRight}
        </header>
      )}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: fitViewport ? "hidden" : "auto",
          overflowX: "hidden",
          display: fitViewport ? "flex" : undefined,
          flexDirection: fitViewport ? "column" : undefined,
          minHeight: fitViewport ? 0 : undefined,
          paddingBottom: showTabBar
            ? fitViewport
              ? "calc(82px + env(safe-area-inset-bottom, 0px))"
              : "calc(96px + env(safe-area-inset-bottom, 0px))"
            : undefined,
        }}
      >
        {children}
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
}
