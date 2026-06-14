"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createCallAudioContext } from "@/lib/audio/mobile-audio-context";
import { isAndroidNative } from "@/lib/native/platform";
import { ExitConfirmDialog } from "@/components/native/ExitConfirmDialog";

interface NativeShellProps {
  children: ReactNode;
}

export function NativeShell({ children }: NativeShellProps) {
  const pathname = usePathname();
  const [pageKey, setPageKey] = useState(pathname);
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    setPageKey(pathname);
    setExitOpen(false);
  }, [pathname]);

  useEffect(() => {
    let removeBackListener: (() => void) | undefined;
    let removeContextMenu: (() => void) | undefined;
    let splashTimer: ReturnType<typeof setTimeout> | undefined;

    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      document.documentElement.classList.add("native-app");

      const { SplashScreen } = await import("@capacitor/splash-screen");
      splashTimer = setTimeout(() => {
        void SplashScreen.hide();
      }, 2000);

      const { App } = await import("@capacitor/app");
      const backHandle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }
        setExitOpen(true);
      });
      removeBackListener = () => {
        void backHandle.remove();
      };

      document.addEventListener("contextmenu", onContextMenu);
      removeContextMenu = () => document.removeEventListener("contextmenu", onContextMenu);

      if (isAndroidNative()) {
        const unlock = () => {
          void createCallAudioContext().resume();
        };
        document.addEventListener("touchstart", unlock, { once: true, passive: true });
      }
    })();

    return () => {
      if (splashTimer) clearTimeout(splashTimer);
      removeBackListener?.();
      removeContextMenu?.();
      document.documentElement.classList.remove("native-app");
    };
  }, []);

  const handleExit = async () => {
    setExitOpen(false);
    const { App } = await import("@capacitor/app");
    await App.exitApp();
  };

  return (
    <>
      <div key={pageKey} className="native-page-root animate-page-enter">
        {children}
      </div>
      <ExitConfirmDialog open={exitOpen} onStay={() => setExitOpen(false)} onExit={() => void handleExit()} />
    </>
  );
}
