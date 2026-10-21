import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { LocaleProvider } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function GermanRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <LocaleProvider locale="de">{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
