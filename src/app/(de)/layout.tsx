import type { Metadata } from "next";
import { LocaleDocument } from "@/components/locale-document";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function GermanRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LocaleDocument locale="de">{children}</LocaleDocument>;
}
