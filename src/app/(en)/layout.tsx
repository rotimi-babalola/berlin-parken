import type { Metadata } from "next";
import { LocaleDocument } from "@/components/locale-document";
import { StoredLocaleRedirect } from "@/components/stored-locale-redirect";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Berlin street parking, zones & fees | Berlin Parken",
  description:
    "Check mapped street parking near a Berlin address, managed parking zones, fees and restrictions. No live space availability.",
};

export default function EnglishRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <LocaleDocument locale="en">
      <StoredLocaleRedirect />
      {children}
    </LocaleDocument>
  );
}
