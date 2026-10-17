// Stars and the daily streak. Pure functions.
import { STAR_GOOD_SCORE, STAR_PERFECT_SCORE } from "./config.ts";
import { addDays, daysBetween, isWeekend, type DayKey } from "./dates.ts";

/** Finishing a set always earns 1 star (effort); doing well earns more. */
export function starsForSet(score: number): 1 | 2 | 3 {
  if (score >= STAR_PERFECT_SCORE) return 3;
  if (score >= STAR_GOOD_SCORE) return 2;
  return 1;
}

export interface Streak {
  /** Days in a row with at least one star. */
  count: number;
  /** Last day a star was earned. */
  lastDay: DayKey | null;
}

export const EMPTY_STREAK: Streak = { count: 0, lastDay: null };

/** True if every day strictly between `from` and `to` may be skipped (weekend, when allowed). */
function gapIsForgiven(from: DayKey, to: DayKey, skipWeekends: boolean): boolean {
  for (let d = addDays(from, 1); d < to; d = addDays(d, 1)) {
    if (!(skipWeekends && isWeekend(d))) return false;
  }
  return true;
}

/** Call when the child earns a star today. */
export function recordStarDay(s: Streak, today: DayKey, skipWeekends: boolean): Streak {
  if (s.lastDay === today) return s;
  if (s.lastDay && daysBetween(s.lastDay, today) > 0 && gapIsForgiven(s.lastDay, today, skipWeekends)) {
    return { count: s.count + 1, lastDay: today };
  }
  return { count: 1, lastDay: today };
}

/** The streak to show today: 0 if a required day was missed (it is not reset in storage until the next star). */
export function currentStreak(s: Streak, today: DayKey, skipWeekends: boolean): number {
  if (!s.lastDay) return 0;
  if (s.lastDay === today) return s.count;
  return gapIsForgiven(s.lastDay, today, skipWeekends) ? s.count : 0;
}
