// Adaptive difficulty. Pure functions; see docs/RULES.md for the rules in plain words.
import {
  DEMOTE_AFTER_WRONG_IN_A_ROW,
  MAX_TIER,
  MAX_TIER_RISE_PER_SET,
  MISTAKE_DEBT,
  PROMOTE_NEED,
  SEED_DOWN_SCORE,
  SEED_UP_SCORE,
  STEPS_PER_TIER,
} from "./config.ts";
import type { Position, Tier } from "./types.ts";

export const START_POSITION: Position = { tier: 1, step: 0 };
export const MAX_INDEX = MAX_TIER * STEPS_PER_TIER - 1;

export function toIndex(p: Position): number {
  return (p.tier - 1) * STEPS_PER_TIER + p.step;
}

export function fromIndex(i: number): Position {
  const c = Math.max(0, Math.min(MAX_INDEX, Math.round(i)));
  return { tier: (Math.floor(c / STEPS_PER_TIER) + 1) as Tier, step: c % STEPS_PER_TIER };
}

/** Clamp a stored position (it may come from an older save). */
export function normalize(p: Partial<Position> | undefined): Position {
  if (!p || typeof p.tier !== "number" || typeof p.step !== "number") return { ...START_POSITION };
  return fromIndex(toIndex(p as Position));
}

/** Difficulty state while one set is being played. */
export interface SetDifficulty {
  /** Where the set started (the seed). */
  readonly start: Position;
  /** Where the next question will be generated. */
  pos: Position;
  /** First-try correct answers since entering this tier or since the last mistake. */
  streakAtTier: number;
  /** Extra correct answers owed at this tier because of a mistake. */
  debt: number;
  /** Wrong first tries in a row. */
  wrongInARow: number;
}

export function startSet(seed: Position): SetDifficulty {
  const start = normalize(seed);
  return { start, pos: { ...start }, streakAtTier: 0, debt: 0, wrongInARow: 0 };
}

function need(tier: Tier, debt: number): number {
  return tier === 1 ? PROMOTE_NEED[1] + debt : PROMOTE_NEED[2] + debt;
}

/** Update after the child's FIRST try at a question. Retries never change difficulty. */
export function afterFirstTry(s: SetDifficulty, correct: boolean): SetDifficulty {
  const maxTier = Math.min(MAX_TIER, s.start.tier + MAX_TIER_RISE_PER_SET) as Tier;
  const next: SetDifficulty = { ...s, pos: { ...s.pos } };

  if (correct) {
    next.wrongInARow = 0;
    next.streakAtTier += 1;
    const canRise = next.pos.tier < maxTier;
    if (canRise && next.streakAtTier >= need(next.pos.tier, next.debt)) {
      next.pos = { tier: (next.pos.tier + 1) as Tier, step: 0 };
      next.streakAtTier = 0;
      next.debt = 0;
    } else {
      next.pos.step = Math.min(STEPS_PER_TIER - 1, next.pos.step + 1);
    }
    return next;
  }

  next.wrongInARow += 1;
  next.streakAtTier = 0;
  next.debt = MISTAKE_DEBT;
  if (next.wrongInARow >= DEMOTE_AFTER_WRONG_IN_A_ROW && next.pos.tier > 1) {
    next.pos = { tier: (next.pos.tier - 1) as Tier, step: STEPS_PER_TIER - 1 };
    next.wrongInARow = 0;
    next.debt = 0;
  } else {
    next.pos.step = Math.max(0, next.pos.step - 1);
  }
  return next;
}

/** Where the NEXT set of this game starts, from this set's seed and score. */
export function nextSeed(seed: Position, score: number): Position {
  const i = toIndex(normalize(seed));
  if (score >= SEED_UP_SCORE) return fromIndex(i + 1);
  if (score <= SEED_DOWN_SCORE) return fromIndex(i - 1);
  return fromIndex(i);
}
