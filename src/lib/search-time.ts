export const DEFAULT_DURATION_MINUTES = 60;
export const DURATION_OPTIONS = [30, 60, 120, 240, 480];
export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 1440;
export const MAX_ARRIVAL_DAYS_AHEAD = 14;
const PAST_TOLERANCE_MS = 5 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDatetimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultArrivalValue(now = Date.now()): string {
  return toDatetimeLocalValue(new Date(now));
}

export type ArrivalError = "missing" | "invalid" | "past" | "tooFar";

export function parseArrivalInstant(
  value: string,
  now = Date.now(),
): { ok: true; ms: number } | { ok: false; error: ArrivalError } {
  if (!value.trim()) return { ok: false, error: "missing" };
  const ms = Date.parse(value.trim());
  if (!Number.isFinite(ms)) return { ok: false, error: "invalid" };
  if (ms < now - PAST_TOLERANCE_MS) return { ok: false, error: "past" };
  if (
    ms >
    now + MAX_ARRIVAL_DAYS_AHEAD * 24 * 60 * 60 * 1000 + PAST_TOLERANCE_MS
  )
    return { ok: false, error: "tooFar" };
  return { ok: true, ms };
}

export function parseArrival(
  value: string,
  now = Date.now(),
): { ok: true; date: Date } | { ok: false; error: ArrivalError } {
  if (!value.trim()) return { ok: false, error: "missing" };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value.trim()))
    return { ok: false, error: "invalid" };
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) return { ok: false, error: "invalid" };
  if (date.getTime() < now - PAST_TOLERANCE_MS)
    return { ok: false, error: "past" };
  if (
    date.getTime() >
    now + MAX_ARRIVAL_DAYS_AHEAD * 24 * 60 * 60 * 1000 + PAST_TOLERANCE_MS
  )
    return { ok: false, error: "tooFar" };
  return { ok: true, date };
}

export type DurationError = "invalid";

export function parseDuration(value: unknown):
  | {
      ok: true;
      minutes: number;
    }
  | { ok: false; error: DurationError } {
  const minutes = typeof value === "string" ? Number(value) : (value as number);
  if (
    !Number.isInteger(minutes) ||
    minutes < MIN_DURATION_MINUTES ||
    minutes > MAX_DURATION_MINUTES
  )
    return { ok: false, error: "invalid" };
  return { ok: true, minutes };
}

export function formatArrival(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(minutes: number, locale: string): string {
  if (minutes < 60)
    return new Intl.NumberFormat(locale).format(minutes) + " min";
  const hours = minutes / 60;
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(hours);
  return locale.startsWith("de") ? `${formatted} Std.` : `${formatted} h`;
}
