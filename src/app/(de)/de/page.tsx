import { SignalPage } from "@/components/signal/SignalPage";
import { homeMetadata } from "@/lib/page-metadata";

export const metadata = homeMetadata("de");

export default function GermanHome() {
  return <SignalPage />;
}
