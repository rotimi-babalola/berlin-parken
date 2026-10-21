import { SignalPage } from "@/components/signal/SignalPage";
import { homeMetadata } from "@/lib/page-metadata";

export const metadata = homeMetadata("en");

export default function Home() {
  return <SignalPage />;
}
