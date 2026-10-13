"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import type { ParkingSummary } from "@/lib/parking";
import {
  DEFAULT_DURATION_MINUTES,
  defaultArrivalValue,
  parseArrival,
  parseDuration,
} from "@/lib/search-time";
import {
  ensureParkingContext,
  type ParkingContext,
} from "@/lib/parking-context";
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

export type ParkingResult = ParkingSummary & ParkingContext;

export function useAddressSearch(initial?: ResultsQuery) {
  const { t } = useLocale();
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
  const [history, setHistory] = useState<AddressSuggestion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [searchReady, setSearchReady] = useState<SearchReady | null>(null);
  const [parking, setParking] = useState<ParkingResult | null>(null);
  const [parkingLoading, setParkingLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const arrivalRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const parkingRequest = useRef<AbortController | null>(null);
  const {
    suggestions,
    status: suggestionState,
    retry,
  } = useAddressSuggestions(query, !selected);
  const visibleSuggestions = suggestionsDismissed ? [] : suggestions;
  // Past searches surface only when the field is focused and empty, so
  // live suggestions always win once the user starts typing.
  const showRecents =
    historyOpen && !suggestionsDismissed && query.trim() === "";
  const dropdownItems =
    visibleSuggestions.length > 0
      ? visibleSuggestions
      : showRecents
        ? history
        : [];

  useEffect(() => {
    if (activeIndex >= 0)
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => () => parkingRequest.current?.abort(), []);

  function cancelParkingRequest() {
    parkingRequest.current?.abort();
    parkingRequest.current = null;
    setParkingLoading(false);
  }

  function chooseSuggestion(suggestion: AddressSuggestion) {
    cancelParkingRequest();
    setSelected(suggestion);
    setQuery(suggestion.label);
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    setHistoryOpen(false);
    setSubmitError(false);
    setSearchReady(null);
    setParking(null);
  }

  function handleInputFocus() {
    setHistory(loadRecentSearches());
    setSuggestionsDismissed(false);
    setHistoryOpen(true);
  }

  function handleInputBlur() {
    setHistoryOpen(false);
  }

  function handleQueryChange(value: string) {
    cancelParkingRequest();
    setQuery(value);
    setSelected(null);
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    setSubmitError(false);
    setSearchReady(null);
    setParking(null);
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
      setHistoryOpen(false);
      setActiveIndex(-1);
    }
  }

  function loadParking(
    destination: AddressSuggestion,
    radiusMeters: number,
    visit: Pick<SearchReady, "arrivalLabel" | "arrivalMs" | "durationMinutes">,
  ) {
    setTimeError(false);
    cancelParkingRequest();
    const controller = new AbortController();
    parkingRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    setSearchReady({
      destination,
      radiusMeters,
      arrivalLabel: visit.arrivalLabel,
      arrivalMs: visit.arrivalMs,
      durationMinutes: visit.durationMinutes,
    });
    setParking(null);
    setParkingLoading(true);
    const params = new URLSearchParams({
      longitude: String(destination.longitude),
      latitude: String(destination.latitude),
      radius: String(radiusMeters),
      arrival: new Date(visit.arrivalMs).toISOString(),
      duration: String(visit.durationMinutes),
    });
    fetch(`/api/parking?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(t("search.parkingUnavailable"));
        const result = (await response.json()) as ParkingSummary &
          Partial<ParkingContext>;
        if (parkingRequest.current === controller)
          setParking({
            ...result,
            ...ensureParkingContext(
              result as unknown as Record<string, unknown>,
            ),
          });
      })
      .catch(() => {
        if (parkingRequest.current !== controller) return;
        setParking({
          status: "unavailable",
          message: t("search.parkingUnavailable"),
          mappedSpaces: 0,
          usableSpaces: 0,
          conditionalSpaces: 0,
          restrictedSpaces: 0,
          unknownSpaces: 0,
          featureCount: 0,
          streets: [],
          zones: {
            source: {
              status: "unavailable",
              message: t("search.zoneUnavailable"),
            },
            items: [],
          },
          events: {
            source: {
              status: "unavailable",
              message: t("search.eventUnavailable"),
            },
            items: [],
          },
        });
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (parkingRequest.current === controller) {
          parkingRequest.current = null;
          setParkingLoading(false);
        }
      });
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
    setHistoryOpen(false);
    router.push(
      buildResultsUrl({
        label: selected.label,
        latitude: selected.latitude,
        longitude: selected.longitude,
        radius,
        arrival,
        duration: parsedDuration.minutes,
      }),
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
    visibleSuggestions,
    dropdownItems,
    recentsHeader:
      showRecents && history.length > 0 ? t("search.historyTitle") : null,
    recentsEmpty: showRecents && history.length === 0,
    dropdownOpen: visibleSuggestions.length > 0 || showRecents,
    suggestionState,
    submitError,
    searchReady,
    parking,
    parkingLoading,
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
      cancelParkingRequest();
      setRadius(value);
      setSearchReady(null);
    },
    handleArrivalChange: (value: string) => {
      cancelParkingRequest();
      setArrival(value);
      setTimeError(false);
      setSearchReady(null);
    },
    handleDurationChange: (value: number) => {
      cancelParkingRequest();
      setDurationMinutes(value);
      setTimeError(false);
      setSearchReady(null);
    },
    retrySuggestions: () => {
      setSuggestionsDismissed(false);
      inputRef.current?.focus();
      retry();
    },
    retryParking: () => {
      if (searchReady)
        loadParking(
          searchReady.destination,
          searchReady.radiusMeters,
          searchReady,
        );
    },
  };
}
