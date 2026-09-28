"use client";

import { useId } from "react";
import type { KeyboardEvent, RefObject, SubmitEvent } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import { useLocale } from "@/lib/i18n";
import styles from "./signal.module.css";

type Props = {
  query: string;
  selected: AddressSuggestion | null;
  radius: number;
  activeIndex: number;
  suggestions: AddressSuggestion[];
  suggestionState: "idle" | "loading" | "empty" | "error" | "ready";
  submitError: boolean;
  liveMessage: string;
  inputRef: RefObject<HTMLInputElement | null>;
  optionRefs: RefObject<Array<HTMLLIElement | null>>;
  onQueryChange: (value: string) => void;
  onChooseSuggestion: (suggestion: AddressSuggestion) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onRadiusChange: (value: number) => void;
  onRetry: () => void;
};

// Dumb: live destination form in City Signal styling. All state and
// data fetching live in useAddressSearch; this file only renders props.
export function SignalSearchForm({
  query,
  selected,
  radius,
  activeIndex,
  suggestions,
  suggestionState,
  submitError,
  liveMessage,
  inputRef,
  optionRefs,
  onQueryChange,
  onChooseSuggestion,
  onKeyDown,
  onSubmit,
  onRadiusChange,
  onRetry,
}: Props) {
  const inputId = useId();
  const listId = useId();
  const { t } = useLocale();

  return (
    <form className={styles.searchForm} onSubmit={onSubmit}>
      <label htmlFor={inputId}>{t("search.addressLabel")}</label>
      <div className={styles.searchLine}>
        <div className={styles.inputWrap}>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            role="combobox"
            autoComplete="off"
            maxLength={120}
            value={query}
            placeholder={t("search.placeholder")}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={suggestions.length > 0}
            aria-activedescendant={
              activeIndex >= 0 && suggestions.length
                ? `${listId}-option-${activeIndex}`
                : undefined
            }
            aria-describedby={`${inputId}-hint ${inputId}-status${submitError ? ` ${inputId}-validation` : ""}`}
            aria-invalid={submitError || undefined}
            aria-busy={suggestionState === "loading"}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {suggestions.length > 0 && (
            <ul
              className={styles.suggestions}
              id={listId}
              role="listbox"
              aria-label={t("search.suggestionsLabel")}
            >
              {suggestions.map((suggestion, index) => (
                <li
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  className={`${styles.suggestion} ${activeIndex === index ? styles.activeSuggestion : ""}`}
                  id={`${listId}-option-${index}`}
                  key={suggestion.id}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChooseSuggestion(suggestion)}
                >
                  <span>
                    {suggestion.label}
                    <small>{suggestion.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit">
          {t("search.submit")}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className={styles.radiusLine}>
        <label htmlFor={`${inputId}-radius`}>{t("search.radiusLabel")}</label>
        <output htmlFor={`${inputId}-radius`} aria-live="off">
          {radius < 1000 ? `${radius} m` : "1 km"}
        </output>
      </div>
      <input
        className={styles.radiusInput}
        id={`${inputId}-radius`}
        type="range"
        min="100"
        max="1000"
        step="100"
        value={radius}
        onChange={(event) => onRadiusChange(Number(event.target.value))}
      />
      <p className={styles.demoHint} id={`${inputId}-hint`}>
        {t("search.hint")}
      </p>
      <span
        className={styles.liveStatus}
        id={`${inputId}-status`}
        role="status"
      >
        {selected
          ? `${t("search.selectedLabel")}: ${selected.label}`
          : liveMessage}
      </span>
      {suggestionState === "error" && (
        <button className={styles.retry} type="button" onClick={onRetry}>
          {t("search.retry")}
        </button>
      )}
      <p className={styles.formError} id={`${inputId}-validation`}>
        {submitError ? t("search.submitError") : ""}
      </p>
      <p className={styles.attribution}>
        {t("search.attributionPrefix")}{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          {t("search.attributionLink")}
        </a>
      </p>
    </form>
  );
}
