"use client";

import { useCallback, useEffect, useState } from "react";
import type { AddressSuggestion } from "@/lib/geocoder/types";

type Result = {
  query: string;
  attempt: number;
  status: "ready" | "empty" | "error";
  suggestions: AddressSuggestion[];
};

export function useAddressSuggestions(query: string, enabled: boolean) {
  const normalizedQuery = query.trim();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled || normalizedQuery.length < 3) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(normalizedQuery)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Address search failed");
        const data: { suggestions?: AddressSuggestion[] } =
          await response.json();
        if (controller.signal.aborted) return;

        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions
          : [];
        setResult({
          query: normalizedQuery,
          attempt,
          status: suggestions.length ? "ready" : "empty",
          suggestions,
        });
      } catch {
        if (!controller.signal.aborted) {
          setResult({
            query: normalizedQuery,
            attempt,
            status: "error",
            suggestions: [],
          });
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, enabled, normalizedQuery]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const currentResult =
    enabled && result?.query === normalizedQuery && result.attempt === attempt
      ? result
      : null;
  const status: "idle" | "loading" | "empty" | "error" | "ready" =
    !enabled || normalizedQuery.length < 3
      ? "idle"
      : (currentResult?.status ?? "loading");

  return {
    suggestions: currentResult?.suggestions ?? [],
    status,
    retry,
  };
}
