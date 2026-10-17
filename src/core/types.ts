import type { Rng } from "./rng.ts";

export type Tier = 1 | 2 | 3;

/** A point on the difficulty ladder: visible tier + hidden step inside it (0-based). */
export interface Position {
  tier: Tier;
  step: number;
}

export const GAME_IDS = ["scale", "robot", "basket", "equations", "split", "compare"] as const;
export type GameId = (typeof GAME_IDS)[number];

/**
 * Result of checking an answer.
 * `reason` is a short machine code (e.g. "leftHeavier", "blocked") that the game's
 * text module turns into a Vietnamese hint; `data` carries the numbers for that hint.
 */
export interface CheckResult {
  correct: boolean;
  reason: string;
  data?: Record<string, unknown>;
}

/**
 * The contract every game's logic implements. Logic is pure: no DOM, no storage,
 * no Math.random (use the Rng passed in), so it can be unit-tested and replayed.
 *
 * Q = question (everything the view needs to draw one question)
 * A = answer   (what the view hands back when the child presses "Xong")
 */
export interface GameLogic<Q, A> {
  readonly id: GameId;
  /** Build one question for a difficulty position. Must always return a solvable question. */
  generate(pos: Position, rng: Rng): Q;
  /** Check an answer. Never throws on odd input; returns correct: false instead. */
  check(question: Q, answer: A): CheckResult;
  /** Optional: a correct answer, used by the guide (i) demo and by tests. */
  solve?(question: Q): A;
}

/** Each game's Vietnamese lines (src/games/<id>/text.ts). Built with say() so text and voice match. */
export interface GameText<Q> {
  /** What Mèo says when the question appears. */
  prompt(question: Q, pos: Position): import("../i18n/speech.ts").Speech;
  /** Hint after a wrong try, or praise detail after a right one. */
  hint(result: CheckResult, question: Q): import("../i18n/speech.ts").Speech;
  /** Steps of the guide (i), shown/read the first time a child opens the game. */
  GUIDE_STEPS: string[];
}
