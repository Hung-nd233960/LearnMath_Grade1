// Rules of the teacher area that are pure enough to test: slider ranges, how a changed limit
// stays consistent with the others, when the unlock expires, and the PIN throttle.
import { DEFAULT_PIN, TEACHER_UNLOCK_MINUTES } from "./config.ts";
import { checkPin, type PinRecord } from "./pin.ts";
import type { Limits } from "./screentime.ts";

export interface Range {
  min: number;
  max: number;
  step: number;
}

/** What the sliders in "Thời gian chơi" may choose. */
export const LIMIT_RANGES: Record<"sessionMin" | "breakMin" | "dailyMin" | "idleNudgeSec", Range> = {
  sessionMin: { min: 5, max: 30, step: 5 },
  breakMin: { min: 2, max: 10, step: 1 },
  dailyMin: { min: 10, max: 60, step: 5 },
  idleNudgeSec: { min: 10, max: 60, step: 5 },
};

export type LimitKey = keyof typeof LIMIT_RANGES;

/** The game pauses this many times later than Mèo's first nudge (20 s → 60 s by default). */
export const PAUSE_AFTER_NUDGE = 3;

function clampToRange(r: Range, value: number): number {
  const stepped = Math.round(value / r.step) * r.step;
  return Math.min(r.max, Math.max(r.min, stepped));
}

/** Change one limit, keeping the others consistent (the pause always comes after the nudge). */
export function setLimit(limits: Limits, key: LimitKey, value: number): Limits {
  const next: Limits = { ...limits, [key]: clampToRange(LIMIT_RANGES[key], value) };
  if (key === "idleNudgeSec") next.idlePauseSec = next.idleNudgeSec * PAUSE_AFTER_NUDGE;
  // never warn about a limit that is further away than the limit itself
  next.warnBeforeMin = Math.min(next.warnBeforeMin, Math.max(1, next.dailyMin - 1));
  return next;
}

/** The teacher area is open from `unlockedAt` until it has been left alone for this long. */
export function unlockValid(unlockedAt: number | null, now: number, minutes = TEACHER_UNLOCK_MINUTES): boolean {
  return unlockedAt !== null && now >= unlockedAt && now - unlockedAt < minutes * 60000;
}

export function isDefaultPin(rec: PinRecord): boolean {
  return checkPin(rec, DEFAULT_PIN);
}

/** After this many wrong PINs in a row the pad waits (a child guessing 4-digit codes is slowed down). */
export const PIN_TRIES = 5;
export const PIN_WAIT_MS = 30_000;

export interface PinAttempts {
  wrong: number;
  /** Epoch ms until which entry is refused, or null. */
  blockedUntil: number | null;
}

export const NO_ATTEMPTS: PinAttempts = { wrong: 0, blockedUntil: null };

export function pinBlocked(a: PinAttempts, now: number): boolean {
  return a.blockedUntil !== null && now < a.blockedUntil;
}

export function afterPinAttempt(a: PinAttempts, ok: boolean, now: number): PinAttempts {
  if (ok) return NO_ATTEMPTS;
  const wrong = a.wrong + 1;
  return wrong >= PIN_TRIES ? { wrong: 0, blockedUntil: now + PIN_WAIT_MS } : { wrong, blockedUntil: null };
}
