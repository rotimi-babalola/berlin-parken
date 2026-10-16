"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SearchReady } from "@/hooks/use-address-search";
import { useLocale } from "@/lib/i18n";
import { ensureParkingContext } from "@/lib/parking-context";
import type { ParkingSummary } from "@/lib/parking";
import type { ParkingContext } from "@/lib/parking-context";
import { parseResultsParams } from "@/lib/results-url";
import { SignalDetails } from "./SignalDetails";
import { SignalFooter } from "./SignalFooter";
import { SignalHeader } from "./SignalHeader";
import { SignalResultStrip } from "./SignalResultStrip";
import { SignalResultsSearch } from "./SignalResultsSearch";
import styles from "./signal.module.css";

type ParkingResult = ParkingSummary & ParkingContext;

// Results page: URL is the query (shareable, refresh-safe). Fetches
// /api/parking from the validated params and reuses the same dumb
// result sections as the previous inline layout.
export function SignalResultsPage() {
  const rawParams = useSearchParams();
  const { t } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    reqKey: string;
    parking: ParkingResult;
  } | null>(null);

  const parsed = parseResultsParams(rawParams);
  // Loading is derived from whether the latest request resolved, so no
  // state sync inside the fetch effect below.
  const reqKey = `${rawParams.toString()}#${attempt}`;
  const parking = result?.reqKey === reqKey ? result.parking : null;
  const loading = parsed.ok && parking === null;

  useEffect(() => {
    if (!parsed.ok) return;
    const value = parsed.value;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    const api = new URLSearchParams({
      longitude: String(value.longitude),
      latitude: String(value.latitude),
      radius: String(value.radius),
      arrival: new Date(value.arrivalMs).toISOString(),
      duration: String(value.duration),
    });
    fetch(`/api/parking?${api}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("parking unavailable");
        const payload = (await response.json()) as ParkingSummary &
          Partial<ParkingContext>;
        if (!cancelled)
          setResult({
            reqKey,
            parking: {
              ...payload,
              ...ensureParkingContext(payload),
            },
          });
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setResult({
          reqKey,
          parking: {
            status: "unavailable",
            message: t("search.parkingUnavailable"),
            mappedSpaces: 0,
            usableSpaces: 0,
            conditionalSpaces: 0,
            restrictedSpaces: 0,
            unknownSpaces: 0,
            featureCount: 0,
            streets: [],
            candidates: [],
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
          },
        });
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch on URL change or manual retry; `reqKey` already covers both, and `parsed`/`t` derive from the same params.
  }, [reqKey]);

  if (!parsed.ok) {
    return (
      <div className={styles.page}>
        <SignalHeader startHref="/" />
        <main>
          <div className={styles.resultsTop}>
            <Link className={styles.backLink} href="/">
              {t("results.back")}
            </Link>
          </div>
          <SignalResultsSearch key={rawParams.toString()} />
          <section className={styles.results} aria-live="polite">
            <p className={styles.emptyResult} role="alert">
              {t("results.invalid")}
            </p>
          </section>
        </main>
        <SignalFooter />
      </div>
    );
  }

  const search: SearchReady = {
    destination: {
      id: "result",
      label: parsed.value.label,
      detail: "",
      latitude: parsed.value.latitude,
      longitude: parsed.value.longitude,
    },
    radiusMeters: parsed.value.radius,
    arrivalLabel: parsed.value.arrival,
    arrivalMs: parsed.value.arrivalMs,
    durationMinutes: parsed.value.duration,
  };
  const { zones, events } = ensureParkingContext(parking);
  const detailsReady =
    !loading && parking && parking.status !== "unavailable"
      ? { search, parking }
      : null;

  return (
    <div className={styles.page}>
      <SignalHeader startHref="/" />
      <main>
        <div className={styles.resultsTop}>
          <Link className={styles.backLink} href="/">
            {t("results.back")}
          </Link>
          <h1 className={styles.resultsTitle}>{parsed.value.label}</h1>
        </div>
        <SignalResultsSearch
          key={rawParams.toString()}
          initial={parsed.value}
        />
        <SignalResultStrip
          search={search}
          parking={parking}
          loading={loading}
          zones={zones}
          events={events}
          onRetry={() => setAttempt((value) => value + 1)}
        />
        {detailsReady && (
          <SignalDetails
            search={detailsReady.search}
            parking={detailsReady.parking}
            zones={zones}
            events={events}
          />
        )}
      </main>
      <SignalFooter />
    </div>
  );
}
