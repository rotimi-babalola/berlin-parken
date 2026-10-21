"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import {
  DEFAULT_DURATION_MINUTES,
  defaultArrivalValue,
  parseArrival,
  parseDuration,
} from "@/lib/search-time";
import { useLocale } from "@/lib/i18n";
import { buildResultsUrl, type ResultsQuery } from "@/lib/results-url";
import { loadRecentSearches, recordRecentSearch } from "@/lib/search-history";
import { useAddressSuggestions } from "./use-address-suggestions";

export type SearchReady = {
  destination: AddressSuggestion;
  radiusMeters: number;
  arrivalLabel: string;
  arrivalMs: number;
  durationMinutes: number;
};

// Past searches surface only when the field is focused and empty, so
// live suggestions always win once the user starts typing.
function useRecentSearches(query: string, suggestionsDismissed: boolean) {
  const [history, setHistory] = useState<AddressSuggestion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const showRecents =
    historyOpen && !suggestionsDismissed && query.trim() === "";
  return {
    showRecents,
    items: showRecents ? history : [],
    open() {
      setHistory(loadRecentSearches());
      setHistoryOpen(true);
    },
    close() {
      setHistoryOpen(false);
    },
  };
}

export function useAddressSearch(initial?: ResultsQuery) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState(initial?.label ?? "");
  const [selected, setSelected] = useState<AddressSuggestion | null>(
    initial
      ? {
          id: "result",
          label: initial.label,
          detail: "",
          latitude: initial.latitude,
          longitude: initial.longitude,
        }
      : null,
  );
  const [radius, setRadius] = useState(initial?.radius ?? 500);
  const [arrival, setArrival] = useState(
    () => initial?.arrival ?? defaultArrivalValue(),
  );
  // Picker hints only; live validation in handleSubmit uses Date.now().
  // Frozen at mount so min/max don't churn every render for long-open tabs.
  const [timeBounds] = useState(() => ({
    min: defaultArrivalValue(),
    max: defaultArrivalValue(Date.now() + 14 * 24 * 60 * 60 * 1000),
  }));
  const [durationMinutes, setDurationMinutes] = useState(
    initial?.duration ?? DEFAULT_DURATION_MINUTES,
  );
  const [timeError, setTimeError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const arrivalRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const {
    suggestions,
    status: suggestionState,
    retry,
  } = useAddressSuggestions(query, !selected);
  const recents = useRecentSearches(query, suggestionsDismissed);
  const visibleSuggestions = suggestionsDismissed ? [] : suggestions;
  const dropdownItems =
    visibleSuggestions.length > 0 ? visibleSuggestions : recents.items;

  useEffect(() => {
    if (activeIndex >= 0)
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function chooseSuggestion(suggestion: AddressSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    recents.close();
    setSubmitError(false);
  }

  function handleInputFocus() {
    setSuggestionsDismissed(false);
    recents.open();
  }

  function handleInputBlur() {
    recents.close();
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    setSubmitError(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && dropdownItems.length) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveIndex((index) =>
        index < 0 ? 0 : (index + 1) % dropdownItems.length,
      );
    } else if (event.key === "ArrowUp" && dropdownItems.length) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveIndex((index) =>
        index <= 0 ? dropdownItems.length - 1 : index - 1,
      );
    } else if (
      event.key === "Enter" &&
      activeIndex >= 0 &&
      dropdownItems.length
    ) {
      event.preventDefault();
      chooseSuggestion(dropdownItems[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestionsDismissed(true);
      recents.close();
      setActiveIndex(-1);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setSubmitError(true);
      inputRef.current?.focus();
      return;
    }
    const parsedArrival = parseArrival(arrival);
    const parsedDuration = parseDuration(durationMinutes);
    if (!parsedArrival.ok || !parsedDuration.ok) {
      setTimeError(true);
      arrivalRef.current?.focus();
      return;
    }
    // Results live on their own shareable page; the URL is the query.
    recordRecentSearch(selected);
    recents.close();
    router.push(
      buildResultsUrl(
        {
          label: selected.label,
          latitude: selected.latitude,
          longitude: selected.longitude,
          radius,
          arrival,
          duration: parsedDuration.minutes,
        },
        locale,
      ),
    );
  }

  let liveMessage = "";
  switch (suggestionState) {
    case "loading":
      liveMessage = t("search.suggestLoading");
      break;
    case "empty":
      liveMessage = t("search.suggestEmpty");
      break;
    case "error":
      liveMessage = t("search.suggestError");
      break;
    case "ready":
      liveMessage = t("search.suggestReady", { count: suggestions.length });
      break;
  }

  return {
    query,
    selected,
    radius,
    arrival,
    arrivalMin: timeBounds.min,
    arrivalMax: timeBounds.max,
    durationMinutes,
    timeError,
    activeIndex,
    dropdownItems,
    recentsHeader:
      recents.showRecents && recents.items.length > 0
        ? t("search.historyTitle")
        : null,
    recentsEmpty: recents.showRecents && recents.items.length === 0,
    suggestionState,
    submitError,
    inputRef,
    arrivalRef,
    optionRefs,
    liveMessage,
    chooseSuggestion,
    handleQueryChange,
    handleInputFocus,
    handleInputBlur,
    handleKeyDown,
    handleSubmit,
    handleRadiusChange: (value: number) => {
      setRadius(value);
    },
    handleArrivalChange: (value: string) => {
      setArrival(value);
      setTimeError(false);
    },
    handleDurationChange: (value: number) => {
      setDurationMinutes(value);
      setTimeError(false);
    },
    retrySuggestions: () => {
      setSuggestionsDismissed(false);
      inputRef.current?.focus();
      retry();
    },
  };
}
