import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berlin street parking, zones & fees | Berlin Parken",
  description:
    "Check mapped street parking near a Berlin address, managed parking zones, fees and restrictions. No live space availability.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
