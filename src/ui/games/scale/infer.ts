// Thăng bằng, Vòng 3: inference. Two balanced clue scales say how fruit weigh in cam ("1 xoài = 3 cam");
// the question scale has fruit on its left pan and an EMPTY right pan, and the child puts as many cam there as
// it takes to balance. The weights are never shown: the child reads them off the clue scales.
//   step 0  2 of one kind (the other clue is not needed)   step 1  a mix of two kinds   step 2  two chains
// The big scale is the same one as Vòng 1 (balance.ts), drawn smaller; the clues are small level scales (compare.ts).
import { say } from "../../../i18n/speech.ts";
import { inferWeight, UNIT, type InferAnswer, type InferClue, type InferItem, type InferQuestion } from "../../../games/scale/logic.ts";
import { emoji, h } from "../../dom.ts";
import type { GameView } from "../types.ts";
import { mountBalance, type Balance } from "./balance.ts";
import { miniScaleFrame } from "./compare.ts";
import "./infer.css";

/** The fruit lying in one pan of a clue scale, sized so five of them (two rows) still fit above the bowl. */
function items(list: readonly InferItem[]): HTMLElement {
  const size = list.length <= 2 ? 50 : 30;
  return h("div", { class: "in-items" }, ...list.map((k) => emoji(k, size)));
}

/** A level clue scale: both pans hold the same weight. */
function clueScale(c: InferClue, index: number): HTMLElement {
  return miniScaleFrame(index, 0, { L: items(c.left), R: items(c.right) },
    { "data-clue": String(index), "data-left": c.left.join(","), "data-right": c.right.join(",") });
}

export function createInferView(): GameView<InferQuestion, InferAnswer> {
  let scale: Balance | null = null;
  let pan: HTMLElement | null = null;

  return {
    mount(root, q, api) {
      root.append(h("div", { class: "in-clues" }, ...q.clues.map(clueScale)));
      const host = h("div", { class: "in-scale" });
      root.append(host);
      scale = mountBalance(host, {
        left: q.asked,
        right: [],
        tray: Array<InferItem>(q.tray).fill(UNIT),
        weight: (k) => inferWeight(q, k as InferItem),
        liveTilt: false,
        leftLocked: true,
        className: "infer",
      }, () => {
        const placed = scale!.added().right.length;
        if (placed === 0) {
          // nothing on the empty pan yet: remind the child what to do instead of counting a wrong try
          pan?.classList.add("shake");
          setTimeout(() => pan?.classList.remove("shake"), 450);
          api.speak(say("infer_one"));
          return;
        }
        api.submit({ placed });
      });
      pan = host.querySelector<HTMLElement>(".sc-pan.R");
      pan?.append(h("div", { class: "in-qmark" }, "?"));
    },

    playResult: () => scale!.showResult(),
    reset: () => scale?.hold(),
    reveal: (answer) => scale!.reveal([], Array<InferItem>(answer.placed).fill(UNIT)),

    unmount() {
      scale?.dispose();
      scale = null;
      pan = null;
    },
  };
}
