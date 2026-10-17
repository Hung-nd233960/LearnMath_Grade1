// One set = SET_LENGTH questions of one game. SetRunner is the state machine the
// game screen drives: show question → child answers → correct / retry / reveal → next.
// It holds no DOM and no storage; the shell saves the summary when the set ends.
import { RETRIES_PER_QUESTION, SET_LENGTH } from "./config.ts";
import { afterFirstTry, nextSeed, startSet, type SetDifficulty } from "./difficulty.ts";
import { starsForSet } from "./rewards.ts";
import type { Rng } from "./rng.ts";
import type { CheckResult, GameLogic, Position } from "./types.ts";

/**
 * What happened after an answer:
 * - "correct":        right on the first try (counts toward the score)
 * - "correctOnRetry": right on the retry (does not count)
 * - "retry":          wrong; show the hint, the child may try again
 * - "reveal":         wrong and out of tries; show the right answer, then move on
 */
export type Outcome = "correct" | "correctOnRetry" | "retry" | "reveal";

export interface AnswerFeedback {
  outcome: Outcome;
  result: CheckResult;
  /** True when the set may move to the next question (anything but "retry"). */
  canContinue: boolean;
}

export interface SetSummary {
  seed: Position;
  score: number;
  total: number;
  stars: 1 | 2 | 3;
  nextSeed: Position;
  /** Highest tier reached during the set. */
  peakTier: number;
  /** First-try result per question. */
  firstTries: boolean[];
}

export class SetRunner<Q, A> {
  private diff: SetDifficulty;
  private tries = 0;
  private q!: Q;
  private qPos!: Position;
  private readonly firstTries: boolean[] = [];
  private peak: number;
  index = 0;

  constructor(
    private readonly logic: GameLogic<Q, A>,
    private readonly seed: Position,
    private readonly rng: Rng,
    private readonly length: number = SET_LENGTH,
  ) {
    this.diff = startSet(seed);
    this.peak = this.diff.pos.tier;
    this.makeQuestion(undefined);
  }

  /** The question on screen, and the position it was generated at (tier shown as "Vòng N"). */
  get question(): Q { return this.q; }
  get position(): Position { return this.qPos; }
  get finished(): boolean { return this.index >= this.length; }
  /** 0-based question number, and how many questions in the set (for the progress dots). */
  get progress(): { index: number; length: number } { return { index: this.index, length: this.length }; }

  answer(a: A): AnswerFeedback {
    if (this.finished) throw new Error("SetRunner.answer: set already finished");
    const result = this.logic.check(this.q, a);
    if (this.tries === 0) {
      this.firstTries.push(result.correct);
      this.diff = afterFirstTry(this.diff, result.correct);
      this.peak = Math.max(this.peak, this.diff.pos.tier);
    }
    this.tries += 1;
    if (result.correct) return { outcome: this.tries === 1 ? "correct" : "correctOnRetry", result, canContinue: true };
    if (this.tries <= RETRIES_PER_QUESTION) return { outcome: "retry", result, canContinue: false };
    return { outcome: "reveal", result, canContinue: true };
  }

  /** A correct answer for the current question, if the game provides one (guide / reveal). */
  solution(): A | undefined {
    return this.logic.solve?.(this.q);
  }

  /** Move to the next question. Call after an outcome with canContinue. */
  next(): void {
    if (this.finished) return;
    this.index += 1;
    if (!this.finished) this.makeQuestion(this.q);
  }

  summary(): SetSummary {
    const score = this.firstTries.filter(Boolean).length;
    return {
      seed: this.seed,
      score,
      total: this.length,
      stars: starsForSet(score),
      nextSeed: nextSeed(this.seed, score),
      peakTier: this.peak,
      firstTries: this.firstTries.slice(),
    };
  }

  private makeQuestion(previous: Q | undefined): void {
    this.tries = 0;
    this.qPos = { ...this.diff.pos };
    // Avoid showing the exact same question twice in a row.
    const prevKey = previous === undefined ? "" : JSON.stringify(previous);
    let q = this.logic.generate(this.qPos, this.rng);
    for (let i = 0; i < 8 && JSON.stringify(q) === prevKey; i++) q = this.logic.generate(this.qPos, this.rng);
    this.q = q;
  }
}
