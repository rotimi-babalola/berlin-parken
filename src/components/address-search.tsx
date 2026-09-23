"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import styles from "./address-search.module.css";
import { useAddressSuggestions } from "./use-address-suggestions";

type SearchReady = { destination: AddressSuggestion; radiusMeters: number };

export function AddressSearch() {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [radius, setRadius] = useState(500);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [searchReady, setSearchReady] = useState<SearchReady | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const { suggestions, status: suggestionState, retry } = useAddressSuggestions(query, !selected);
  const visibleSuggestions = suggestionsDismissed ? [] : suggestions;

  useEffect(() => {
    if (activeIndex >= 0) optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function chooseSuggestion(suggestion: AddressSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    setSubmitError(false);
    setSearchReady(null);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    setSubmitError(false);
    setSearchReady(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveIndex((index) => (index < 0 ? 0 : (index + 1) % suggestions.length));
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0 && visibleSuggestions.length) {
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
  }

  const liveMessage = suggestionState === "loading"
    ? "Searching Berlin addresses."
    : suggestionState === "empty"
      ? "No Berlin addresses found. Try a street and house number."
      : suggestionState === "error"
        ? "Address search is temporarily unavailable."
        : suggestionState === "ready"
          ? `${suggestions.length} Berlin addresses found. Use the arrow keys to choose one.`
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
              aria-expanded={visibleSuggestions.length > 0}
              aria-activedescendant={activeIndex >= 0 && visibleSuggestions.length ? `${listId}-option-${activeIndex}` : undefined}
              aria-describedby={`${inputId}-hint ${inputId}-status${submitError ? ` ${inputId}-validation` : ""}`}
              aria-invalid={submitError || undefined}
              aria-busy={suggestionState === "loading"}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            {selected && <span className={styles.selectedMark} aria-label="Address selected">✓</span>}
            {visibleSuggestions.length > 0 && (
              <ul className={styles.suggestions} id={listId} role="listbox" aria-label="Berlin address suggestions">
                {visibleSuggestions.map((suggestion, index) => (
                  <li
                    ref={(node) => { optionRefs.current[index] = node; }}
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
          <span className={styles.hint} id={`${inputId}-hint`}>Enter at least 3 characters, then select a suggestion to confirm the location.</span>
          <span
            className={styles.liveStatus}
            id={`${inputId}-status`}
            role="status"
          >
            {liveMessage}
          </span>
          {suggestionState === "error" && (
            <button
              className={styles.retry}
              type="button"
              onClick={() => {
                setSuggestionsDismissed(false);
                inputRef.current?.focus();
                retry();
              }}
            >
              Try again
            </button>
          )}
          {submitError && (
            <span className={styles.errorStatus} id={`${inputId}-validation`}>
              Select a Berlin address suggestion before continuing.
            </span>
          )}
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

        <button className={styles.submit} type="submit">
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
