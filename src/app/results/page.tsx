import type { Metadata } from "next";
import { Suspense } from "react";
import { SignalResultsPage } from "@/components/signal/SignalResultsPage";

export const metadata: Metadata = {
  title: "Results — Berlin Parken",
  description:
    "Mapped street parking, paid zones and planned events around your Berlin destination.",
};

// useSearchParams() below needs a Suspense boundary for static prerendering.
export default function ResultsRoute() {
  return (
    <Suspense>
      <SignalResultsPage />
    </Suspense>
  );
}
