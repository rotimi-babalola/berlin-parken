"use client";

import { useId } from "react";
import type { KeyboardEvent, RefObject, SubmitEvent } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import { useLocale } from "@/lib/i18n";
import { DURATION_OPTIONS, formatDuration } from "@/lib/search-time";
import styles from "./signal.module.css";

type Props = {
  query: string;
  selected: AddressSuggestion | null;
  radius: number;
  arrival: string;
  arrivalMin: string;
  arrivalMax: string;
  durationMinutes: number;
  timeError: boolean;
  activeIndex: number;
  suggestions: AddressSuggestion[];
  suggestionState: "idle" | "loading" | "empty" | "error" | "ready";
  submitError: boolean;
  liveMessage: string;
  inputRef: RefObject<HTMLInputElement | null>;
  arrivalRef: RefObject<HTMLInputElement | null>;
  optionRefs: RefObject<Array<HTMLLIElement | null>>;
  onQueryChange: (value: string) => void;
  onChooseSuggestion: (suggestion: AddressSuggestion) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onRadiusChange: (value: number) => void;
  onArrivalChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onRetry: () => void;
};

// Dumb: live destination form in City Signal styling. All state and
// data fetching live in useAddressSearch; this file only renders props.
export function SignalSearchForm({
  query,
  selected,
  radius,
  arrival,
  arrivalMin,
  arrivalMax,
  durationMinutes,
  timeError,
  activeIndex,
  suggestions,
  suggestionState,
  submitError,
  liveMessage,
  inputRef,
  arrivalRef,
  optionRefs,
  onQueryChange,
  onChooseSuggestion,
  onKeyDown,
  onSubmit,
  onRadiusChange,
  onArrivalChange,
  onDurationChange,
  onRetry,
}: Props) {
  const inputId = useId();
  const listId = useId();
  const { t, locale } = useLocale();

  return (
    // noValidate: arrival/range hints stay as picker aids; this form's own
    // bilingual validation (submitError/timeError + focus) is the single path.
    <form className={styles.searchForm} onSubmit={onSubmit} noValidate>
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
          {suggestionState === "loading" && (
            <span className={styles.spinner} aria-hidden="true" />
          )}
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
      <div className={styles.radiusGroup}>
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
      </div>
      <div className={styles.timeRow}>
        <div className={styles.timeField}>
          <label htmlFor={`${inputId}-arrival`}>
            {t("search.arrivalLabel")}
          </label>
          <input
            ref={arrivalRef}
            id={`${inputId}-arrival`}
            type="datetime-local"
            value={arrival}
            min={arrivalMin}
            max={arrivalMax}
            aria-invalid={timeError || undefined}
            aria-describedby={timeError ? `${inputId}-time-error` : undefined}
            onChange={(event) => onArrivalChange(event.target.value)}
          />
        </div>
        <div className={styles.timeField}>
          <label htmlFor={`${inputId}-duration`}>
            {t("search.durationLabel")}
          </label>
          <select
            id={`${inputId}-duration`}
            value={durationMinutes}
            onChange={(event) => onDurationChange(Number(event.target.value))}
          >
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatDuration(minutes, locale)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className={styles.formError} id={`${inputId}-time-error`}>
        {timeError ? t("search.timeError") : ""}
      </p>
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
