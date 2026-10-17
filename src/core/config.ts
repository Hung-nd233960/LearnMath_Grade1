// Every tunable rule of the app lives here, so the teachers' feedback can be applied
// by changing numbers, not code. See docs/RULES.md for what each rule means.

/** Questions in one set (one play session of one game). */
export const SET_LENGTH = 5;

/** Visible rounds ("Vòng 1/2/3"). */
export const MAX_TIER = 3;

/** Hidden steps inside each tier. Position index = (tier - 1) * STEPS_PER_TIER + step. */
export const STEPS_PER_TIER = 3;

/**
 * First-try correct answers needed at a tier before moving up, without mistakes.
 * Tier 1 → 2 needs 1, tier 2 → 3 needs 2 ("Vòng 2 always has at least 2 questions").
 */
export const PROMOTE_NEED = { 1: 1, 2: 2 } as const;

/** Extra correct answers needed at the current tier after a mistake (the "careful" penalty). */
export const MISTAKE_DEBT = 1;

/** This many wrong first tries in a row drop the child one tier. */
export const DEMOTE_AFTER_WRONG_IN_A_ROW = 2;

/**
 * Within one set the tier may rise at most this far above the set's starting tier.
 * This is what makes Vòng 3 take several days: the start point only moves one hidden
 * step per set (see SEED_*), so climbing from Vòng 1 to Vòng 3 needs several good sets.
 */
export const MAX_TIER_RISE_PER_SET = 1;

/** Next set's start moves up one hidden step at this score or better... */
export const SEED_UP_SCORE = 4;
/** ...and down one hidden step at this score or worse. */
export const SEED_DOWN_SCORE = 1;

/** Stars for a set: finishing = 1, score >= GOOD = 2, score >= PERFECT = 3. */
export const STAR_GOOD_SCORE = 3;
export const STAR_PERFECT_SCORE = 5;

/** Wrong first try → hint → this many retries. Retries never count toward the score. */
export const RETRIES_PER_QUESTION = 1;

/** Robot: longest program a child can build. */
export const MAX_PROGRAM_STEPS = 12;

/** Keep at most this many finished sets per profile (oldest dropped). */
export const SESSION_HISTORY_MAX = 300;

/** Screen-time defaults; teachers change them in the teacher area. */
export const DEFAULT_LIMITS = {
  /** Minutes of play before a break screen. */
  sessionMin: 15,
  /** Length of the break, minutes. */
  breakMin: 5,
  /** Minutes of play per day, after which the app locks until tomorrow. */
  dailyMin: 30,
  /** Warn this many minutes before the daily limit. */
  warnBeforeMin: 2,
  /** Seconds without touching the screen before Mèo nudges. */
  idleNudgeSec: 60,
  /** Seconds without touching the screen before the game pauses (idle time is never counted). */
  idlePauseSec: 180,
} as const;

/** Default PIN for the teacher area until a teacher changes it. */
export const DEFAULT_PIN = "1234";

/** The teacher area must be re-opened after this long. */
export const TEACHER_UNLOCK_MINUTES = 30;
