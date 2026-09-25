"use client";

import { useId } from "react";
import type { KeyboardEvent, RefObject, SubmitEvent } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";
import { useLocale } from "@/lib/i18n";
import styles from "./address-search.module.css";

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

export function AddressSearchForm({
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
    <>
      <div className={styles.panelHeading}>
        <div>
          <h2 id="search-title">{t("search.title")}</h2>
          <p>{t("search.subtitle")}</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={inputId}>
            {t("search.addressLabel")}
          </label>
          <div className={styles.inputWrap}>
            <svg
              aria-hidden="true"
              className={styles.pin}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <circle
                cx="12"
                cy="10"
                r="2.3"
                stroke="currentColor"
                strokeWidth="1.7"
              />
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
            {selected && (
              <span
                className={styles.selectedMark}
                aria-label={t("search.selectedLabel")}
              >
                ✓
              </span>
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
                    <span className={styles.suggestionIcon} aria-hidden="true">
                      ↗
                    </span>
                    <span className={styles.suggestionText}>
                      <span className={styles.suggestionLabel}>
                        {suggestion.label}
                      </span>
                      <span className={styles.suggestionDetail}>
                        {suggestion.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className={styles.hint} id={`${inputId}-hint`}>
            {t("search.hint")}
          </span>
          <span
            className={styles.liveStatus}
            id={`${inputId}-status`}
            role="status"
          >
            {liveMessage}
          </span>
          {suggestionState === "error" && (
            <button className={styles.retry} type="button" onClick={onRetry}>
              {t("search.retry")}
            </button>
          )}
          {submitError && (
            <span className={styles.errorStatus} id={`${inputId}-validation`}>
              {t("search.submitError")}
            </span>
          )}
        </div>

        <fieldset className={styles.radiusField}>
          <legend className={styles.label}>{t("search.radiusLegend")}</legend>
          <div className={styles.radiusValue}>
            <span>{t("search.radiusLabel")}</span>
            <output htmlFor={`${inputId}-radius`} aria-live="off">
              {radius < 1000 ? `${radius} m` : "1 km"}
            </output>
          </div>
          <input
            className={styles.slider}
            id={`${inputId}-radius`}
            type="range"
            min="100"
            max="1000"
            step="100"
            value={radius}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
          />
          <div className={styles.rangeLabels} aria-hidden="true">
            <span>100 m</span>
            <span>1 km</span>
          </div>
        </fieldset>

        <button className={styles.submit} type="submit">
          {t("search.submit")}
          <span aria-hidden="true">→</span>
        </button>
      </form>

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
    </>
  );
}
