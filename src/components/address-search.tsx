"use client";

import { ensureParkingContext } from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";
import { AddressSearchForm } from "./address-search-form";
import { EventSection } from "./event-section";
import { NearbyContext } from "./nearby-context";
import { ParkingResults } from "./parking-results";
import { ZoneSection } from "./zone-section";
import { useAddressSearch } from "../hooks/use-address-search";

// Stateful container: owns search + parking data, lays out search panel
// (dumb form + supply report) beside the context rail (zones + events).
export function AddressSearch() {
  const search = useAddressSearch();
  const { t } = useLocale();
  const { zones, events } = ensureParkingContext(
    (search.parking ?? {}) as Record<string, unknown>,
  );
  const contextReady = !search.parkingLoading && search.parking;

  return (
    <div className={styles.workspace}>
      <section className={styles.searchPanel} aria-labelledby="search-title">
        <AddressSearchForm
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
        <ParkingResults
          search={search.searchReady}
          parking={search.parking}
          loading={search.parkingLoading}
          onRetry={search.retryParking}
        />
      </section>
      <aside className={styles.sideRail} aria-label={t("context.asideLabel")}>
        <NearbyContext />
        {search.parkingLoading ? (
          <div className={styles.railCard}>
            <p role="status">{t("context.loading")}</p>
          </div>
        ) : contextReady ? (
          <>
            <div className={styles.railCard}>
              <ZoneSection zones={zones} />
            </div>
            <div className={styles.railCard}>
              <EventSection events={events} />
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
