"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import type { ParkingSummary } from "@/lib/parking";
import {
  ensureParkingContext,
  type ParkingContext,
} from "@/lib/parking-context";
import { useLocale } from "@/lib/i18n";
import { useAddressSuggestions } from "./use-address-suggestions";

export type SearchReady = {
  destination: AddressSuggestion;
  radiusMeters: number;
};

export type ParkingResult = ParkingSummary & ParkingContext;

export function useAddressSearch() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [radius, setRadius] = useState(500);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [searchReady, setSearchReady] = useState<SearchReady | null>(null);
  const [parking, setParking] = useState<ParkingResult | null>(null);
  const [parkingLoading, setParkingLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const parkingRequest = useRef<AbortController | null>(null);
  const {
    suggestions,
    status: suggestionState,
    retry,
  } = useAddressSuggestions(query, !selected);
  const visibleSuggestions = suggestionsDismissed ? [] : suggestions;

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
    setSubmitError(false);
    setSearchReady(null);
    setParking(null);
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
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveIndex((index) =>
        index < 0 ? 0 : (index + 1) % suggestions.length,
      );
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
    } else if (
      event.key === "Enter" &&
      activeIndex >= 0 &&
      visibleSuggestions.length
    ) {
      event.preventDefault();
      chooseSuggestion(visibleSuggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestionsDismissed(true);
      setActiveIndex(-1);
    }
  }

  function loadParking(destination: AddressSuggestion, radiusMeters: number) {
    cancelParkingRequest();
    const controller = new AbortController();
    parkingRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    setSearchReady({ destination, radiusMeters });
    setParking(null);
    setParkingLoading(true);
    const params = new URLSearchParams({
      longitude: String(destination.longitude),
      latitude: String(destination.latitude),
      radius: String(radiusMeters),
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
    loadParking(selected, radius);
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
    activeIndex,
    visibleSuggestions,
    suggestionState,
    submitError,
    searchReady,
    parking,
    parkingLoading,
    inputRef,
    optionRefs,
    liveMessage,
    chooseSuggestion,
    handleQueryChange,
    handleKeyDown,
    handleSubmit,
    handleRadiusChange: (value: number) => {
      cancelParkingRequest();
      setRadius(value);
      setSearchReady(null);
    },
    retrySuggestions: () => {
      setSuggestionsDismissed(false);
      inputRef.current?.focus();
      retry();
    },
    retryParking: () => {
      if (searchReady)
        loadParking(searchReady.destination, searchReady.radiusMeters);
    },
  };
}
