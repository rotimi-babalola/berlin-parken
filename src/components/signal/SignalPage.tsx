"use client";

import { useAddressSearch } from "@/hooks/use-address-search";
import { AreaLinks } from "./AreaLinks";
import { SignalFooter } from "./SignalFooter";
import { SignalHeader } from "./SignalHeader";
import { SignalHero } from "./SignalHero";
import { SignalSearchForm } from "./SignalSearchForm";
import { SignalSearchPanel } from "./SignalSearchPanel";
import styles from "./signal.module.css";

// Search-only landing: the form navigates to /results (shareable URL).
// Result fetching and rendering live on the results page.
export function SignalPage() {
  const search = useAddressSearch();

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
              arrival={search.arrival}
              arrivalMin={search.arrivalMin}
              arrivalMax={search.arrivalMax}
              durationMinutes={search.durationMinutes}
              timeError={search.timeError}
              activeIndex={search.activeIndex}
              suggestions={search.dropdownItems}
              recentsHeader={search.recentsHeader}
              recentsEmpty={search.recentsEmpty}
              suggestionState={search.suggestionState}
              submitError={search.submitError}
              liveMessage={search.liveMessage}
              inputRef={search.inputRef}
              arrivalRef={search.arrivalRef}
              optionRefs={search.optionRefs}
              onQueryChange={search.handleQueryChange}
              onInputFocus={search.handleInputFocus}
              onInputBlur={search.handleInputBlur}
              onChooseSuggestion={search.chooseSuggestion}
              onKeyDown={search.handleKeyDown}
              onSubmit={search.handleSubmit}
              onRadiusChange={search.handleRadiusChange}
              onArrivalChange={search.handleArrivalChange}
              onDurationChange={search.handleDurationChange}
              onRetry={search.retrySuggestions}
            />
          </SignalSearchPanel>
        </SignalHero>
        <AreaLinks />
      </main>
      <SignalFooter />
    </div>
  );
}
