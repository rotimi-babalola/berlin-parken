import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berlin Parken — Know the streets before you arrive",
  description:
    "Explore mapped street parking, paid zones and planned events around a Berlin destination.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
