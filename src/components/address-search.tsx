"use client";

import { ensureParkingContext } from "@/lib/parking-context";
import styles from "./address-search.module.css";
import { AddressSearchForm } from "./address-search-form";
import { EventSection } from "./event-section";
import { ParkingResults } from "./parking-results";
import { ZoneSection } from "./zone-section";
import { useAddressSearch } from "../hooks/use-address-search";

const dataSources = ["Street parking", "Parking zones", "Road events"];

// Dumb: static explainer card at the top of the side rail.
function NearbyContext() {
  return (
    <div className={styles.context}>
      <div className={styles.contextTop}>
        <h2>Know what’s nearby.</h2>
        <p>
          Official Berlin data can show parking infrastructure and street
          restrictions. It can’t tell us which spaces are free right now.
        </p>
      </div>
      <div className={styles.sourceList}>
        <span className={styles.sourceHeading}>WHAT WE LOOK AT</span>
        {dataSources.map((source, index) => (
          <div className={styles.sourceRow} key={source}>
            <span className={styles.sourceIndex}>0{index + 1}</span>
            <span>{source}</span>
            <span className={styles.sourceArrow} aria-hidden="true">
              ↗
            </span>
          </div>
        ))}
      </div>
      <p className={styles.contextFoot}>
        Built around Berlin’s open geodata<span aria-hidden="true"> · </span>
        Updated as source data allows
      </p>
    </div>
  );
}

// Stateful container: owns search + parking data, lays out search panel
// (dumb form + supply report) beside the context rail (zones + events).
export function AddressSearch() {
  const search = useAddressSearch();
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
        />
      </section>
      <aside className={styles.sideRail} aria-label="Nearby context">
        <NearbyContext />
        {search.parkingLoading ? (
          <div className={styles.railCard}>
            <p role="status">Loading zones and events…</p>
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
