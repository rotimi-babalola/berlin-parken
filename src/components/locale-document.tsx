import { Analytics } from "@vercel/analytics/next";
import type { ReactNode } from "react";
import { LocaleProvider, type Locale } from "@/lib/i18n";
import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google";

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
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        )}
      </body>
    </html>
  );
}
