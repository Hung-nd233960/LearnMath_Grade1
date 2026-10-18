// Game 6 — Quy luật (patterns). PLACEHOLDER: the real generator comes with docs/tasks/03-quy-luat.md.
// This stub only keeps the registry, saves and tests valid while the tile shows "Sắp ra mắt".
import type { CheckResult, GameLogic } from "../../core/types.ts";

export interface PatternQuestion {
  answer: number;
}

/** Index of the tapped option. */
export type PatternAnswer = number;

export const patternLogic: GameLogic<PatternQuestion, PatternAnswer> = {
  id: "pattern",
  generate: () => ({ answer: 0 }),
  check: (q, a): CheckResult => (a === q.answer ? { correct: true, reason: "right" } : { correct: false, reason: "wrongPick" }),
  solve: (q) => q.answer,
};
