import {
  parseValidityWindows,
  type StayInterval,
  type ValidityWindow,
} from "./parking.ts";

export type FeeRate = { amountEur: number; perMinutes: number };
export type ZoneCostInput = {
  hours?: string;
  fee?: string;
  note?: string;
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
  if (!Number.isFinite(rate) || rate <= 0) return null;
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

const berlinFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const BERLIN_DAY: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};

function berlinMinute(ms: number): { day: number; minutes: number } {
  const date = new Date(ms);
  let day = date.getDay();
  let minutes = 0;
  for (const part of berlinFormat.formatToParts(date)) {
    if (part.type === "weekday")
      day = BERLIN_DAY[part.value.slice(0, 3).toLowerCase()] ?? day;
    else if (part.type === "hour") minutes += Number(part.value) * 60;
    else if (part.type === "minute") minutes += Number(part.value);
  }
  return { day, minutes };
}

function chargedMinutes(
  windows: ValidityWindow[],
  arrivalMs: number,
  durationMinutes: number,
): number {
  // ponytail: per-minute scan, stays capped at 24h so ≤1440 iterations
  let charged = 0;
  for (let i = 0; i < durationMinutes; i++) {
    const { day, minutes } = berlinMinute(arrivalMs + i * 60_000);
    if (
      windows.some(
        (w) =>
          w.days.includes(day) &&
          (w.start <= w.end
            ? minutes >= w.start && minutes < w.end
            : minutes >= w.start || minutes < w.end),
      )
    )
      charged++;
  }
  return charged;
}

export function estimateZoneCost(
  zone: ZoneCostInput,
  stay: StayInterval,
): ZoneCost {
  // The dataset's disclaimer note appears on virtually every zone; it stays
  // visible in the UI next to the estimate rather than suppressing it.
  // Guidance-only is reserved for truly missing/unparseable fee or hours.
  if (!zone.fee?.trim()) return { kind: "guidance", reason: "missing-fee" };
  if (!zone.hours?.trim()) return { kind: "guidance", reason: "missing-hours" };
  const rate = parseFeeRate(zone.fee);
  if (!rate) return { kind: "guidance", reason: "unparseable-fee" };
  const windows = parseZoneHours(zone.hours);
  if (!windows) return { kind: "guidance", reason: "unparseable-hours" };
  const charged = chargedMinutes(windows, stay.arrivalMs, stay.durationMinutes);
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

export function formatEur(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
