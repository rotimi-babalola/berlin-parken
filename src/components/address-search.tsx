"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, FormEvent } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import styles from "./address-search.module.css";

type SearchReady = { destination: AddressSuggestion; radiusMeters: number };
type SuggestionState = "idle" | "loading" | "ready" | "empty" | "error";

export function AddressSearch() {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [radius, setRadius] = useState(500);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionState, setSuggestionState] = useState<SuggestionState>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchReady, setSearchReady] = useState<SearchReady | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected || query.trim().length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionState("loading");
      setActiveIndex(-1);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Address search failed");
        const data: { suggestions?: AddressSuggestion[] } = await response.json();
        if (controller.signal.aborted) return;
        const results = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(results);
        setSuggestionState(results.length ? "ready" : "empty");
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionState("error");
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  function chooseSuggestion(suggestion: AddressSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setSuggestions([]);
    setSuggestionState("idle");
    setActiveIndex(-1);
    setSearchReady(null);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setSuggestions([]);
    setActiveIndex(-1);
    setSearchReady(null);
    setSuggestionState(value.trim().length >= 3 ? "loading" : "idle");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && suggestions.length) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex < 0 ? 0 : activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setSuggestionState("idle");
      setActiveIndex(-1);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      inputRef.current?.focus();
      return;
    }
    setSuggestions([]);
    setSearchReady({ destination: selected, radiusMeters: radius });
  }

  const liveMessage = suggestionState === "loading"
    ? "Searching Berlin addresses."
    : suggestionState === "empty"
      ? "No Berlin addresses found. Try a street and house number."
      : suggestionState === "error"
        ? "Address search is temporarily unavailable. Please try again."
        : "";

  return (
    <section className={styles.searchPanel} aria-labelledby="search-title">
      <div className={styles.panelHeading}>
        <span className={styles.step}>01</span>
        <div>
          <h2 id="search-title">Where are you going?</h2>
          <p>Choose a destination in Berlin to see the streets around it.</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={inputId}>Destination address</label>
          <div className={styles.inputWrap}>
            <svg aria-hidden="true" className={styles.pin} viewBox="0 0 24 24" fill="none">
              <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <input
              ref={inputRef}
              id={inputId}
              className={styles.addressInput}
              type="search"
              role="combobox"
              autoComplete="off"
              maxLength={120}
              value={query}
              placeholder="e.g. Invalidenstraße 117"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={suggestions.length > 0}
              aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
              aria-describedby={`${inputId}-hint ${inputId}-status`}
              aria-busy={suggestionState === "loading"}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            {selected && <span className={styles.selectedMark} aria-label="Address selected">✓</span>}
            {suggestions.length > 0 && (
              <ul className={styles.suggestions} id={listId} role="listbox" aria-label="Berlin address suggestions">
                {suggestions.map((suggestion, index) => (
                  <li
                    className={`${styles.suggestion} ${activeIndex === index ? styles.activeSuggestion : ""}`}
                    id={`${listId}-option-${index}`}
                    key={suggestion.id}
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    <span className={styles.suggestionIcon} aria-hidden="true">↗</span>
                    <span className={styles.suggestionText}>
                      <span className={styles.suggestionLabel}>{suggestion.label}</span>
                      <span className={styles.suggestionDetail}>{suggestion.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className={styles.hint} id={`${inputId}-hint`}>Start typing; select a suggestion to confirm the location.</span>
          <span
            className={suggestionState === "error" ? styles.errorStatus : styles.liveStatus}
            id={`${inputId}-status`}
            role={suggestionState === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {liveMessage}
          </span>
        </div>

        <fieldset className={styles.radiusField}>
          <legend className={styles.label}>How far are you willing to walk?</legend>
          <div className={styles.radiusValue}>
            <span>Search radius</span>
            <output htmlFor={`${inputId}-radius`} aria-live="off">{radius < 1000 ? `${radius} m` : "1 km"}</output>
          </div>
          <input
            className={styles.slider}
            id={`${inputId}-radius`}
            type="range"
            min="100"
            max="1000"
            step="100"
            value={radius}
            onChange={(event) => {
              setRadius(Number(event.target.value));
              setSearchReady(null);
            }}
          />
          <div className={styles.rangeLabels} aria-hidden="true"><span>100 m</span><span>1 km</span></div>
        </fieldset>

        <button className={styles.submit} type="submit" disabled={!selected}>
          Check nearby streets
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <p className={styles.attribution}>
        Suggestions by Photon · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
      </p>

      {searchReady && (
        <div className={styles.readyState} role="status" aria-live="polite">
          <span className={styles.readyIcon} aria-hidden="true">✓</span>
          <span><strong>Search area set</strong><br />{searchReady.destination.label} · within {searchReady.radiusMeters < 1000 ? `${searchReady.radiusMeters} m` : "1 km"}</span>
        </div>
      )}
    </section>
  );
}
