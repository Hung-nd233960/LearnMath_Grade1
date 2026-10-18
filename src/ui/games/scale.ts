// Thăng bằng: one game, three kinds of question. This view only picks the right sub-view for the question
// and passes everything through; the sub-views are in ./scale/.
//   balance (Vòng 1)  add fruit until both pans weigh the same          scale/balance.ts
//   compare (Vòng 2)  read small scales: heaviest / lightest / order    scale/compare.ts
//   infer   (Vòng 3)  clue scales give weights in cam; fill the pan     scale/infer.ts
import type { ScaleAnswer, ScaleQuestion } from "../../games/scale/logic.ts";
import { createBalanceView } from "./scale/balance.ts";
import { createCompareView } from "./scale/compare.ts";
import { createInferView } from "./scale/infer.ts";
import type { GameView } from "./types.ts";

export function createScaleView(): GameView<ScaleQuestion, ScaleAnswer> {
  let active: GameView<any, any> | null = null;

  return {
    mount(el, q, api) {
      active = q.kind === "balance" ? createBalanceView() : q.kind === "compare" ? createCompareView() : createInferView();
      active.mount(el, q, api);
    },
    playResult: (fb) => active?.playResult?.(fb) ?? Promise.resolve(),
    reset: () => active?.reset?.(),
    reveal: (answer) => active?.reveal?.(answer) ?? Promise.resolve(),
    unmount() {
      active?.unmount();
      active = null;
    },
  };
}
