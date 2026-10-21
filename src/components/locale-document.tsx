import { Analytics } from "@vercel/analytics/next";
import type { ReactNode } from "react";
import { LocaleProvider, type Locale } from "@/lib/i18n";

// One root document for both route groups, so <html lang>, the locale provider
// and analytics cannot drift apart.
export function LocaleDocument({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
