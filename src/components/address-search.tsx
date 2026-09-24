"use client";

import styles from "./address-search.module.css";
import { AddressSearchForm } from "./address-search-form";
import { ParkingResults } from "./parking-results";
import { useAddressSearch } from "./use-address-search";

export function AddressSearch() {
  const search = useAddressSearch();

  return (
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
      <ParkingResults search={search.searchReady} parking={search.parking} loading={search.parkingLoading} />
    </section>
  );
}
