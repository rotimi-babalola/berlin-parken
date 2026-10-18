"use client";

import { useEffect, useState } from "react";
import { candidateMapPoint } from "@/lib/candidate-map";
import type { ParkingCandidate } from "@/lib/parking";
import type { WalkingRoute } from "@/lib/walking-route";

// Pedestrian routes for the suggested areas, fetched once the parking response
// resolves. Returns `null` while they load; an entry is `null` when that single
// route failed, so the caller falls back to straight-line distance.
export function useWalkingRoutes(
  areas: ParkingCandidate[],
  destination: { latitude: number; longitude: number } | null,
): Record<string, WalkingRoute | null> | null {
  const [result, setResult] = useState<{
    areas: ParkingCandidate[];
    routes: Record<string, WalkingRoute | null>;
  } | null>(null);
  const latitude = destination?.latitude;
  const longitude = destination?.longitude;

  useEffect(() => {
    if (!areas.length || latitude === undefined || longitude === undefined)
      return;
    const toLat = latitude;
    const toLon = longitude;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    Promise.all(
      areas.map(async (area) => {
        const from = candidateMapPoint(area, toLon, toLat);
        const params = new URLSearchParams({
          fromLat: String(from.latitude),
          fromLon: String(from.longitude),
          toLat: String(toLat),
          toLon: String(toLon),
        });
        try {
          const response = await fetch(`/api/walk?${params}`, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Walking route unavailable");
          return [area.id, (await response.json()) as WalkingRoute] as const;
        } catch {
          return [area.id, null] as const;
        }
      }),
    )
      .then((entries) => {
        // A timed-out fetch resolves to null entries and still updates the
        // caller; only an unmount discards the result.
        if (!cancelled)
          setResult({ areas, routes: Object.fromEntries(entries) });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [areas, latitude, longitude]);

  return result?.areas === areas ? result.routes : null;
}
