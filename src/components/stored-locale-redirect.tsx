"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { readStoredLocale } from "@/lib/i18n";
import { equivalentPath } from "@/lib/locale-path";

// Only routes that exist under /de can be rewritten; English-only mock routes
// such as /design would otherwise be sent to a German 404.
function hasGermanRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/results" ||
    pathname.startsWith("/parking/")
  );
}

// Returning German visitors keep their stored preference without making the
// stored value authoritative: the URL always renders the language it names.
export function StoredLocaleRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (readStoredLocale() !== "de") return;
    if (!hasGermanRoute(pathname)) return;
    router.replace(
      `${equivalentPath(pathname, "de")}${window.location.search}`,
    );
  }, [pathname, router]);

  return null;
}
