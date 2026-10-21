import { Suspense } from "react";
import { SignalResultsPage } from "@/components/signal/SignalResultsPage";
import { resultsMetadata } from "@/lib/page-metadata";

export const metadata = resultsMetadata("de");

// useSearchParams() below needs a Suspense boundary for static prerendering.
export default function GermanResultsRoute() {
  return (
    <Suspense>
      <SignalResultsPage />
    </Suspense>
  );
}
