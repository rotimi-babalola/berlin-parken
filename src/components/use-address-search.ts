"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import type { ParkingSummary } from "@/lib/parking";
import { useAddressSuggestions } from "./use-address-suggestions";

export type SearchReady = {
  destination: AddressSuggestion;
  radiusMeters: number;
};

export function useAddressSearch() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [radius, setRadius] = useState(500);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [searchReady, setSearchReady] = useState<SearchReady | null>(null);
  const [parking, setParking] = useState<ParkingSummary | null>(null);
  const [parkingLoading, setParkingLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
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

  function chooseSuggestion(suggestion: AddressSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    setSubmitError(false);
    setSearchReady(null);
    setParking(null);
  }

  function handleQueryChange(value: string) {
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

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setSubmitError(true);
      inputRef.current?.focus();
      return;
    }
    setSearchReady({ destination: selected, radiusMeters: radius });
    setParking(null);
    setParkingLoading(true);
    const params = new URLSearchParams({
      longitude: String(selected.longitude),
      latitude: String(selected.latitude),
      radius: String(radius),
    });
    fetch(`/api/parking?${params}`)
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Parking data is temporarily unavailable.");
        setParking((await response.json()) as ParkingSummary);
      })
      .catch(() =>
        setParking({
          status: "unavailable",
          message: "Parking data is temporarily unavailable.",
          mappedSpaces: 0,
          usableSpaces: 0,
          conditionalSpaces: 0,
          restrictedSpaces: 0,
          unknownSpaces: 0,
          featureCount: 0,
          streets: [],
        }),
      )
      .finally(() => setParkingLoading(false));
  }

  let liveMessage = "";
  switch (suggestionState) {
    case "loading":
      liveMessage = "Searching Berlin addresses.";
      break;
    case "empty":
      liveMessage = "No Berlin addresses found. Try a street and house number.";
      break;
    case "error":
      liveMessage = "Address search is temporarily unavailable.";
      break;
    case "ready":
      liveMessage = `${suggestions.length} Berlin addresses found. Use the arrow keys to choose one.`;
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
      setRadius(value);
      setSearchReady(null);
    },
    retrySuggestions: () => {
      setSuggestionsDismissed(false);
      inputRef.current?.focus();
      retry();
    },
  };
}
