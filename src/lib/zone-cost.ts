import {
  chargedMinutesInWindows,
  parseValidityWindows,
  type StayInterval,
  type ValidityWindow,
} from "./parking.ts";

export type FeeRate = { amountEur: number; perMinutes: number };
export type ZoneCostInput = {
  hours?: string;
  fee?: string;
};
export type ZoneCost =
  | {
      kind: "estimate";
      chargedMinutes: number;
      totalMinutes: number;
      rateEur: number;
      perMinutes: number;
      totalEur: number;
    }
  | { kind: "free"; chargedMinutes: 0; totalMinutes: number }
  | {
      kind: "guidance";
      reason:
        | "missing-fee"
        | "missing-hours"
        | "unparseable-fee"
        | "unparseable-hours";
    };

// Parses "2 € / 30 Min", "3 €/Std", "0,50 € je 15 Minuten". A bare amount
// ("3,00 Euro") is the dataset's hourly fee per the Berlin Open Data catalog,
// so it defaults to per 60 minutes. Null only when no amount is found.
export function parseFeeRate(value: string): FeeRate | null {
  const text = value.trim();
  if (!text) return null;
  const amount = text.match(/(\d+(?:[.,]\d+)?)\s*(€|euro)/i);
  if (!amount) return null;
  const rate = Number(amount[1].replace(",", "."));
  // A zero amount ("0 €") is a free zone, not missing data.
  if (!Number.isFinite(rate) || rate < 0) return null;
  const after = text.slice((amount.index ?? 0) + amount[0].length);
  const unit = after.match(/(\d+(?:[.,]\d+)?)?\s*(min|std|stunde|hour|h)\b/i);
  if (!unit) return { amountEur: rate, perMinutes: 60 };
  const count = unit[1] ? Number(unit[1].replace(",", ".")) : 1;
  if (!Number.isFinite(count) || count <= 0) return null;
  const perMinutes = /min/i.test(unit[2])
    ? Math.round(count)
    : Math.round(count * 60);
  if (!perMinutes || perMinutes <= 0) return null;
  return { amountEur: rate, perMinutes };
}

// Zone hours use short forms ("Mo–Sa 9–20 Uhr") while the parking parser
// needs HH:MM. Normalizing dashes + bare hours lets us reuse it verbatim.
// Seasonal rules ("Advents-Sa") are not interpretable as weekly windows,
// so they return null and callers show guidance instead of a wrong total.
export function parseZoneHours(value: string): ValidityWindow[] | null {
  const text = value.trim();
  if (!text) return null;
  if (/advent/i.test(text)) return null;
  const normalized = text
    .replace(/[–—]/g, "-")
    .replace(/\b(\d{1,2})\s*-\s*(\d{1,2})\b(?!\s*[:.])/g, "$1:00-$2:00");
  return parseValidityWindows(normalized);
}

export function estimateZoneCost(
  zone: ZoneCostInput,
  stay: StayInterval,
): ZoneCost {
  // The dataset's disclaimer note appears on virtually every zone; it stays
  // visible in the UI next to the estimate rather than suppressing it.
  // Guidance-only is reserved for truly missing/unparseable fee or hours.
  // An explicit free marker ("gebührenfrei") or a zero amount means the zone
  // is free, regardless of hours.
  if (!zone.fee?.trim()) return { kind: "guidance", reason: "missing-fee" };
  if (/gebührenfrei|kostenlos|\bfree\b/i.test(zone.fee))
    return {
      kind: "free",
      chargedMinutes: 0,
      totalMinutes: stay.durationMinutes,
    };
  if (!zone.hours?.trim()) return { kind: "guidance", reason: "missing-hours" };
  const rate = parseFeeRate(zone.fee);
  if (!rate) return { kind: "guidance", reason: "unparseable-fee" };
  if (rate.amountEur === 0)
    return {
      kind: "free",
      chargedMinutes: 0,
      totalMinutes: stay.durationMinutes,
    };
  const windows = parseZoneHours(zone.hours);
  if (!windows) return { kind: "guidance", reason: "unparseable-hours" };
  const charged = chargedMinutesInWindows(
    windows,
    stay.arrivalMs,
    stay.durationMinutes,
  );
  if (charged === 0)
    return {
      kind: "free",
      chargedMinutes: 0,
      totalMinutes: stay.durationMinutes,
    };
  const units = Math.ceil(charged / rate.perMinutes);
  const totalEur = Math.round(units * rate.amountEur * 100) / 100;
  return {
    kind: "estimate",
    chargedMinutes: charged,
    totalMinutes: stay.durationMinutes,
    rateEur: rate.amountEur,
    perMinutes: rate.perMinutes,
    totalEur,
  };
}

const eurFormats = new Map<string, Intl.NumberFormat>();

export function formatEur(amount: number, locale: string): string {
  let format = eurFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    });
    eurFormats.set(locale, format);
  }
  return format.format(amount);
}
