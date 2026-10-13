"use client";

import { useAddressSearch } from "@/hooks/use-address-search";
import { useLocale } from "@/lib/i18n";
import type { ResultsQuery } from "@/lib/results-url";
import { SignalSearchForm } from "./SignalSearchForm";
import styles from "./signal.module.css";

// Editable search on the results page, prefilled from the URL so refining
// never requires going back home. Remounted per URL (key) to resync state
// after navigating to a new search.
export function SignalResultsSearch({ initial }: { initial?: ResultsQuery }) {
  const search = useAddressSearch(initial);
  const { t } = useLocale();
  const Heading = initial ? "h2" : "h1";

  return (
    <section className={styles.resultsSearch}>
      <Heading className={styles.resultsSearchTitle}>
        {t("results.searchTitle")}
      </Heading>
      <SignalSearchForm
        query={search.query}
        selected={search.selected}
        radius={search.radius}
        arrival={search.arrival}
        arrivalMin={search.arrivalMin}
        arrivalMax={search.arrivalMax}
        durationMinutes={search.durationMinutes}
        timeError={search.timeError}
        activeIndex={search.activeIndex}
        suggestions={search.visibleSuggestions}
        suggestionState={search.suggestionState}
        submitError={search.submitError}
        liveMessage={search.liveMessage}
        inputRef={search.inputRef}
        arrivalRef={search.arrivalRef}
        optionRefs={search.optionRefs}
        onQueryChange={search.handleQueryChange}
        onChooseSuggestion={search.chooseSuggestion}
        onKeyDown={search.handleKeyDown}
        onSubmit={search.handleSubmit}
        onRadiusChange={search.handleRadiusChange}
        onArrivalChange={search.handleArrivalChange}
        onDurationChange={search.handleDurationChange}
        onRetry={search.retrySuggestions}
      />
    </section>
  );
}
