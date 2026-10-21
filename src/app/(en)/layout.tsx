import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { StoredLocaleRedirect } from "@/components/stored-locale-redirect";
import { LocaleProvider } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function EnglishRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider locale="en">
          <StoredLocaleRedirect />
          {children}
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
