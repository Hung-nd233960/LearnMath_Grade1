// Screen-time model. Pure: the shell calls tick() about once a second with the
// current time and reacts to the result. Nothing here touches timers or the DOM.
//
// Rules (docs/RULES.md):
// - only active time counts: once the child has been idle for idlePauseSec, time stops;
// - after sessionMin of play a break is DUE; after dailyMin (+ adult bonus) a lock is DUE;
// - the shell applies a due break/lock only BETWEEN sets, never in the middle of one.
import { DEFAULT_LIMITS } from "./config.ts";
import type { DayKey } from "./dates.ts";

export type Limits = { -readonly [K in keyof typeof DEFAULT_LIMITS]: number };

export interface Usage {
  day: DayKey;
  /** Counted play time today. */
  playedMs: number;
  /** Counted play time since the last break. */
  sessionMs: number;
  /** Extra time an adult granted today (PIN). */
  bonusMs: number;
  /** While set, a break is running until this time (epoch ms). */
  breakUntil: number | null;
  lastTickAt: number | null;
  lastInputAt: number;
  nudged: boolean;
  paused: boolean;
  warned: boolean;
}

export type Mode = "play" | "idle" | "paused" | "break" | "locked";

/** One-shot events; each fires once until reset (by input, a new day, etc.). */
export type TimeEvent = "newDay" | "idleNudge" | "idlePause" | "warnDaily" | "breakOver";

export interface TickResult {
  usage: Usage;
  mode: Mode;
  events: TimeEvent[];
  /** A break should start as soon as the current set ends. */
  breakDue: boolean;
  /** The app should lock as soon as the current set ends. */
  lockDue: boolean;
  dailyLeftMs: number;
  breakLeftMs: number;
}

/** Longest gap one tick may count (protects against sleep/background tabs). */
const MAX_TICK_MS = 5000;

export function defaultLimits(): Limits {
  return { ...DEFAULT_LIMITS };
}

export function newUsage(day: DayKey, now: number): Usage {
  return { day, playedMs: 0, sessionMs: 0, bonusMs: 0, breakUntil: null, lastTickAt: null, lastInputAt: now, nudged: false, paused: false, warned: false };
}

export const dailyCapMs = (u: Usage, l: Limits) => l.dailyMin * 60000 + u.bonusMs;

/** Play time left today in ms, as shown on the home screen. A usage record from an earlier day counts as a fresh day. */
export function dailyLeftNow(u: Usage, l: Limits, today: DayKey): number {
  const sameDay = u.day === today;
  return Math.max(0, l.dailyMin * 60000 + (sameDay ? u.bonusMs : 0) - (sameDay ? u.playedMs : 0));
}

/** Call on every touch / click / key press. */
export function noteInput(u: Usage, now: number): Usage {
  return { ...u, lastInputAt: now, nudged: false, paused: false };
}

export function startBreak(u: Usage, now: number, l: Limits): Usage {
  return { ...u, breakUntil: now + l.breakMin * 60000 };
}

/** An adult unlocked more time with the PIN. */
export function grantBonus(u: Usage, minutes: number): Usage {
  return { ...u, bonusMs: u.bonusMs + minutes * 60000, warned: false };
}

/** An adult ended the break early with the PIN. */
export function endBreak(u: Usage): Usage {
  return { ...u, breakUntil: null, sessionMs: 0 };
}

export function tick(prev: Usage, now: number, l: Limits, today: DayKey): TickResult {
  const events: TimeEvent[] = [];
  let u: Usage = { ...prev };

  if (u.day !== today) {
    u = newUsage(today, now);
    events.push("newDay");
  }

  const delta = u.lastTickAt === null ? 0 : Math.max(0, Math.min(MAX_TICK_MS, now - u.lastTickAt));
  u.lastTickAt = now;

  let mode: Mode;
  if (u.breakUntil !== null && now < u.breakUntil) {
    mode = "break";
  } else {
    if (u.breakUntil !== null) {
      u.breakUntil = null;
      u.sessionMs = 0;
      u.lastInputAt = now; // the break is over: do not count it as idleness
      events.push("breakOver");
    }
    const idle = now - u.lastInputAt;
    if (idle >= l.idlePauseSec * 1000) {
      mode = "paused";
      if (!u.paused) { u.paused = true; events.push("idlePause"); }
    } else {
      u.playedMs += delta;
      u.sessionMs += delta;
      mode = idle >= l.idleNudgeSec * 1000 ? "idle" : "play";
      if (mode === "idle" && !u.nudged) { u.nudged = true; events.push("idleNudge"); }
    }
  }

  const cap = dailyCapMs(u, l);
  const dailyLeftMs = Math.max(0, cap - u.playedMs);
  if (!u.warned && dailyLeftMs > 0 && dailyLeftMs <= l.warnBeforeMin * 60000) {
    u.warned = true;
    events.push("warnDaily");
  }
  const lockDue = u.playedMs >= cap;
  if (lockDue && mode !== "break") mode = "locked";

  return {
    usage: u,
    mode,
    events,
    breakDue: !lockDue && u.breakUntil === null && u.sessionMs >= l.sessionMin * 60000,
    lockDue,
    dailyLeftMs,
    breakLeftMs: u.breakUntil === null ? 0 : Math.max(0, u.breakUntil - now),
  };
}
