"use client";

import { useAddressSearch } from "@/hooks/use-address-search";
import { ensureParkingContext } from "@/lib/parking-context";
import { SignalDetails } from "./SignalDetails";
import { SignalFooter } from "./SignalFooter";
import { SignalHeader } from "./SignalHeader";
import { SignalHero } from "./SignalHero";
import { SignalResultStrip } from "./SignalResultStrip";
import { SignalSearchForm } from "./SignalSearchForm";
import { SignalSearchPanel } from "./SignalSearchPanel";
import styles from "./signal.module.css";

// Smart container: owns search + parking state via useAddressSearch,
// derives zone/event context, and composes dumb Signal sections.
// It fetches nothing itself and renders no markup of its own.
export function SignalPage() {
  const search = useAddressSearch();
  const { zones, events } = ensureParkingContext(
    (search.parking ?? {}) as Record<string, unknown>,
  );
  const detailsReady =
    !search.parkingLoading &&
    search.searchReady &&
    search.parking &&
    search.parking.status !== "unavailable"
      ? {
          search: search.searchReady,
          parking: search.parking,
        }
      : null;

  return (
    <div className={styles.page}>
      <SignalHeader />
      <main>
        <SignalHero>
          <SignalSearchPanel>
            <SignalSearchForm
              query={search.query}
              selected={search.selected}
              radius={search.radius}
              activeIndex={search.activeIndex}
              suggestions={search.visibleSuggestions}
              suggestionState={search.suggestionState}
              submitError={search.submitError}
              liveMessage={search.liveMessage}
              inputRef={search.inputRef}
              optionRefs={search.optionRefs}
              onQueryChange={search.handleQueryChange}
              onChooseSuggestion={search.chooseSuggestion}
              onKeyDown={search.handleKeyDown}
              onSubmit={search.handleSubmit}
              onRadiusChange={search.handleRadiusChange}
              onRetry={search.retrySuggestions}
            />
          </SignalSearchPanel>
        </SignalHero>
        <SignalResultStrip
          search={search.searchReady}
          parking={search.parking}
          loading={search.parkingLoading}
          zones={zones}
          events={events}
          onRetry={search.retryParking}
        />
        {detailsReady && (
          <SignalDetails
            search={detailsReady.search}
            parking={detailsReady.parking}
            zones={zones}
            events={events}
          />
        )}
      </main>
      <SignalFooter />
    </div>
  );
}
