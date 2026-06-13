"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isUserDetail = pathname.startsWith("/admin/user");

  return (
    <AdminShell
      backHref={isUserDetail ? "/admin" : undefined}
      backLabel={isUserDetail ? "Dashboard" : undefined}
      title={
        pathname.startsWith("/admin/content") ? "Inhalt"
          : pathname.startsWith("/admin/generate") ? "Generieren"
            : pathname.startsWith("/admin/illustrations") ? "Illustrationen"
              : pathname.startsWith("/admin/feedback") ? "Feedback"
                : isUserDetail ? "Nutzerprofil"
                  : undefined
      }
    >
      {children}
    </AdminShell>
  );
}
