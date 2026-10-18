import type { Metadata } from "next";
import { Suspense } from "react";
import { SignalResultsPage } from "@/components/signal/SignalResultsPage";

export const metadata: Metadata = {
  title: "Berlin street parking results | Berlin Parken",
  description:
    "Review mapped street parking, managed parking zones, fees and restrictions near your Berlin destination. No live space availability.",
};

// useSearchParams() below needs a Suspense boundary for static prerendering.
export default function ResultsRoute() {
  return (
    <Suspense>
      <SignalResultsPage />
    </Suspense>
  );
}
