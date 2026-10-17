// Local calendar days as "YYYY-MM-DD" strings. Streaks and daily limits use the
// device's local day (Vietnam: UTC+7), never UTC.

export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(d: Date = new Date()): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Noon local time, so adding days never trips over daylight-saving changes. */
export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

/** Saturday or Sunday. */
export function isWeekend(key: DayKey): boolean {
  const wd = parseDay(key).getDay();
  return wd === 0 || wd === 6;
}

/** Monday = 0 … Sunday = 6 (Vietnamese week display: T2 … CN). */
export function weekdayIndex(key: DayKey): number {
  return (parseDay(key).getDay() + 6) % 7;
}
