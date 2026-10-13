import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateZoneCost,
  parseFeeRate,
  parseZoneHours,
} from "../src/lib/zone-cost.ts";

// 2026-10-12 is a Monday (CEST, +02:00).
const monday = (time: string) => Date.parse(`2026-10-12T${time}+02:00`);
const sunday = (time: string) => Date.parse(`2026-10-11T${time}+02:00`);

test("parses common Berlin fee formats", () => {
  assert.deepEqual(parseFeeRate("2 € / 30 Min"), {
    amountEur: 2,
    perMinutes: 30,
  });
  assert.deepEqual(parseFeeRate("1,00 € / 15 Min."), {
    amountEur: 1,
    perMinutes: 15,
  });
  assert.deepEqual(parseFeeRate("3 €/Std"), { amountEur: 3, perMinutes: 60 });
  // Bare amounts are the dataset's hourly fee (Berlin Open Data catalog).
  assert.deepEqual(parseFeeRate("4,00 Euro"), {
    amountEur: 4,
    perMinutes: 60,
  });
  assert.deepEqual(parseFeeRate("3,00 Euro"), {
    amountEur: 3,
    perMinutes: 60,
  });
  assert.equal(parseFeeRate(""), null);
  assert.equal(parseFeeRate("gebührenfrei"), null);
});

test("parses short zone-hour formats via the shared validity parser", () => {
  assert.deepEqual(parseZoneHours("Mo-Sa 9-20 Uhr"), [
    { days: [1, 2, 3, 4, 5, 6], start: 540, end: 1200 },
  ]);
  assert.deepEqual(parseZoneHours("Mo–Sa 9–20 Uhr"), [
    { days: [1, 2, 3, 4, 5, 6], start: 540, end: 1200 },
  ]);
  assert.equal(parseZoneHours("werktags 9-20 Uhr"), null);
  assert.equal(
    parseZoneHours("Mo-Fr 9-17 Uhr, Sa 9-14 Uhr / Advents-Sa 9-17 Uhr"),
    null,
  );
  assert.equal(parseZoneHours(""), null);
});

test("estimates a weekday stay fully inside charged hours", () => {
  const result = estimateZoneCost(
    { hours: "Mo–Sa 9–20 Uhr", fee: "2 € / 30 Min" },
    { arrivalMs: monday("10:00:00"), durationMinutes: 60 },
  );
  assert.equal(result.kind, "estimate");
  if (result.kind !== "estimate") return;
  assert.equal(result.chargedMinutes, 60);
  assert.equal(result.totalEur, 4);
});

test("rounds up to the billing unit", () => {
  const result = estimateZoneCost(
    { hours: "Mo–Sa 9–20 Uhr", fee: "2 € / 30 Min" },
    { arrivalMs: monday("10:00:00"), durationMinutes: 45 },
  );
  assert.equal(result.kind, "estimate");
  if (result.kind !== "estimate") return;
  assert.equal(result.chargedMinutes, 45);
  assert.equal(result.totalEur, 4);
});

test("reports free when the stay falls outside charged hours", () => {
  const result = estimateZoneCost(
    { hours: "Mo–Sa 9–20 Uhr", fee: "2 € / 30 Min" },
    { arrivalMs: sunday("10:00:00"), durationMinutes: 60 },
  );
  assert.equal(result.kind, "free");
});

test("estimates the Zone 72 shape: bare hourly fee with a disclaimer note", () => {
  const result = estimateZoneCost(
    {
      hours: "Mo-Fr 9-20 Uhr / Sa 9-18 Uhr",
      fee: "3,00 Euro",
      note: "Gebührenhöhe und Bewirtschaftungszeiten können auf lokal begrenzten Abschnitten bisweilen abweichen",
    },
    { arrivalMs: monday("10:00:00"), durationMinutes: 60 },
  );
  assert.equal(result.kind, "estimate");
  if (result.kind !== "estimate") return;
  assert.equal(result.chargedMinutes, 60);
  assert.equal(result.totalEur, 3);
});

test("shows guidance without a total when data is missing or seasonal rules apply", () => {
  assert.deepEqual(
    estimateZoneCost(
      { hours: "Mo–Sa 9–20 Uhr" },
      { arrivalMs: monday("10:00:00"), durationMinutes: 60 },
    ),
    { kind: "guidance", reason: "missing-fee" },
  );
  assert.deepEqual(
    estimateZoneCost(
      { fee: "2 € / 30 Min" },
      { arrivalMs: monday("10:00:00"), durationMinutes: 60 },
    ),
    { kind: "guidance", reason: "missing-hours" },
  );
  assert.deepEqual(
    estimateZoneCost(
      { hours: "Mo–Sa 9–20 Uhr", fee: "gebührenfrei" },
      { arrivalMs: monday("10:00:00"), durationMinutes: 60 },
    ),
    { kind: "guidance", reason: "unparseable-fee" },
  );
  assert.deepEqual(
    estimateZoneCost(
      {
        hours: "Mo-Fr 9-17 Uhr, Sa 9-14 Uhr / Advents-Sa 9-17 Uhr",
        fee: "2,00 Euro",
      },
      { arrivalMs: monday("10:00:00"), durationMinutes: 60 },
    ),
    { kind: "guidance", reason: "unparseable-hours" },
  );
});
