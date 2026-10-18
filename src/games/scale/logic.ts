// Game 1 — Thăng bằng (the old Cái cân and So sánh cân, merged). One game, three kinds of question:
//   Vòng 1  balance: add fruit from the tray until both pans weigh the same        (balance.ts)
//   Vòng 2  compare: read small scales; tap the heaviest / lightest or put in order  (compare.ts)
//   Vòng 3  infer: clue scales say how fruit weigh in cam; fill the empty pan        (infer.ts)
// `generate`, `check` and `solve` look at the question's `kind`.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";
import { checkBalance, generateBalance, solveBalance, type BalanceAnswer, type BalanceQuestion } from "./balance.ts";
import { checkCompare, generateCompare, solveCompare, type CompareAnswer, type CompareQuestion } from "./compare.ts";
import { checkInfer, generateInfer, solveInfer, type InferAnswer, type InferQuestion } from "./infer.ts";

export { compareSign, weightOf, WEIGHT, type Fruit, type BalanceAnswer, type BalanceQuestion } from "./balance.ts";
export { BOXES, type Box, type CompareAnswer, type CompareQuestion, type Weighing } from "./compare.ts";
export { INFER_KINDS, UNIT, inferWeight, possibleAnswers, type InferAnswer, type InferClue, type InferItem, type InferKind, type InferQuestion } from "./infer.ts";

export type ScaleQuestion = BalanceQuestion | CompareQuestion | InferQuestion;
export type ScaleAnswer = BalanceAnswer | CompareAnswer | InferAnswer;

export const scaleLogic: GameLogic<ScaleQuestion, ScaleAnswer> = {
  id: "scale",

  generate(pos: Position, rng: Rng): ScaleQuestion {
    return pos.tier === 1 ? generateBalance(pos, rng) : pos.tier === 2 ? generateCompare(pos, rng) : generateInfer(pos, rng);
  },

  check(q: ScaleQuestion, a: ScaleAnswer): CheckResult {
    switch (q.kind) {
      case "balance": return checkBalance(q, a as BalanceAnswer);
      case "compare": return checkCompare(q, a as CompareAnswer);
      case "infer": return checkInfer(q, a as InferAnswer);
    }
  },

  solve(q: ScaleQuestion): ScaleAnswer {
    switch (q.kind) {
      case "balance": return solveBalance(q);
      case "compare": return solveCompare(q);
      case "infer": return solveInfer(q);
    }
  },
};
