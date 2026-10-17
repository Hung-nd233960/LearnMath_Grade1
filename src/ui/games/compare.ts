// View for "So sánh cân": small scales compare pairs of same-sized gift boxes; the child works out
// which box is the heaviest or lightest, or puts all of them in order.
// The boxes are one picture recoloured, so real-world weight cannot give the answer away: the scales are the only clue.
//   Vòng 1  3 boxes, 2 scales in chain order     Vòng 2  4 boxes, sides flipped
//   Vòng 3  the scales also come in a shuffled order
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { BOXES, type Box, type CompareAnswer, type CompareQuestion, type Weighing } from "../../games/compare/logic.ts";
import { emoji, h, html, wait } from "../dom.ts";
import { ICON } from "../icons.ts";
import type { GameView } from "./types.ts";
import "./compare.css";

/** The gift picture in a box's colour. */
function gift(box: Box, size: number): HTMLImageElement {
  const img = emoji("wrapped_gift", size, "gift");
  img.style.filter = `hue-rotate(${BOXES[box].hue}deg)`;
  img.alt = BOXES[box].name;
  return img;
}

const CHAIN = `<svg class="ch" width="110" height="80" viewBox="0 0 110 80"><path d="M55 4 L8 76 M55 4 L102 76" stroke="#8a6526" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 6"/><circle cx="55" cy="5" r="4.5" fill="url(#brass)" stroke="#1e2a4a" stroke-width="2.5"/></svg>`;
const BOWL = `<svg class="bw" width="110" height="34" viewBox="0 0 110 34"><path d="M3 7 H107 Q100 31 55 31 Q10 31 3 7 Z" fill="url(#bowlG)" stroke="#1e2a4a" stroke-width="4" stroke-linejoin="round"/><rect x="1" y="3" width="108" height="8" rx="4" fill="#ffd86b" stroke="#1e2a4a" stroke-width="3"/></svg>`;
const STAND = `<svg class="cp-mstand" width="80" height="146" viewBox="0 0 80 146"><path d="M34 0 H46 L52 112 H28 Z" fill="url(#brassV)" stroke="#1e2a4a" stroke-width="3" stroke-linejoin="round"/><rect x="30" y="44" width="20" height="7" rx="3.5" fill="url(#brass)" stroke="#1e2a4a" stroke-width="2.5"/><rect x="14" y="108" width="52" height="15" rx="6" fill="url(#wood)" stroke="#1e2a4a" stroke-width="3"/><rect x="3" y="120" width="74" height="20" rx="9" fill="url(#wood)" stroke="#1e2a4a" stroke-width="3"/></svg>`;
const BEAM = `<svg width="230" height="22" viewBox="0 0 230 22"><rect x="8" y="4" width="214" height="14" rx="7" fill="url(#brass)" stroke="#1e2a4a" stroke-width="3"/><rect x="16" y="6.5" width="198" height="3" rx="1.5" fill="#fff6cf" opacity=".8"/><circle cx="10" cy="11" r="6.5" fill="url(#brass)" stroke="#1e2a4a" stroke-width="3"/><circle cx="220" cy="11" r="6.5" fill="url(#brass)" stroke="#1e2a4a" stroke-width="3"/></svg>`;

/** One small scale: the heavier box's side hangs lower. */
function miniScale(w: Weighing, index: number): HTMLElement {
  const deg = w.heavier === "right" ? 9 : -9;
  const dy = 105 * Math.sin((deg * Math.PI) / 180);
  const pan = (box: Box, side: "L" | "R", shift: number) => {
    const el = h("div", { class: `cp-mpan ${side}` }, html(CHAIN), gift(box, 70), html(BOWL));
    el.style.transform = `translateY(${shift}px)`;
    return el;
  };
  const beam = h("div", { class: "cp-mbeam" }, html(BEAM));
  beam.style.transform = `rotate(${deg}deg)`;
  return h("div", { class: "cp-mini", "data-left": w.left, "data-right": w.right, "data-heavier": w.heavier },
    h("span", { class: "tag" }, emoji("balance_scale", 22), STR.compareScale(index + 1)),
    html(STAND), beam, h("div", { class: "cp-mpivot" }), pan(w.left, "L", -dy), pan(w.right, "R", dy));
}

export function createCompareView(): GameView<CompareQuestion, CompareAnswer> {
  let q: CompareQuestion;
  let api: Parameters<GameView<CompareQuestion, CompareAnswer>["mount"]>[2];
  let answerEl: HTMLElement;
  let picked: Box[] = [];
  let lastPick: Box | null = null;
  let firstWrong = 0;

  const isOrder = () => q.mode === "order";

  /** Single-pick mode: the row of boxes to tap. */
  function choices(size: number, used: readonly Box[] = []): HTMLElement {
    return h("div", { class: "cp-choices" }, ...q.items.map((k) =>
      h("button", { class: `cp-choice${used.includes(k) ? " used" : ""}`, "data-k": k, "aria-label": BOXES[k].name,
        onclick: () => (isOrder() ? pickForOrder(k) : pickOne(k)) }, gift(k, size))));
  }

  function pickOne(k: Box) {
    lastPick = k;
    api.submit(k);
  }

  function pickForOrder(k: Box) {
    if (picked.length < q.items.length && !picked.includes(k)) {
      picked.push(k);
      paintOrder();
    }
  }

  /** Order mode: slots from lightest to heaviest, and the boxes still to place. */
  function paintOrder(mark?: "result" | "reveal") {
    const n = q.items.length;
    const slots = Array.from({ length: n }, (_, i) => {
      const box = picked[i];
      const cls = mark && box ? (box === q.truth[i] || mark === "reveal" ? " right" : " wrong") : "";
      const slot = h("button", { class: `cp-slot${cls}`, "data-i": i, "data-k": box ?? null, tabindex: -1 },
        box ? gift(box, 80) : null,
        i === 0 ? h("small", null, STR.lightestLabel) : i === n - 1 ? h("small", null, STR.heaviestLabel) : null);
      // tapping a placed box takes it back out (the ones after it shift left)
      if (box && !mark) slot.addEventListener("click", () => { picked.splice(i, 1); paintOrder(); });
      return [slot, i < n - 1 ? h("span", { class: "cp-arrow" }, "›") : null];
    }).flat();
    answerEl.replaceChildren(h("div", { class: "cp-order" }, h("div", { class: "cp-slots" }, ...slots), choices(90, picked)));
  }

  return {
    mount(root, question, a) {
      q = question;
      api = a;
      picked = [];
      lastPick = null;
      const el = h("div", { class: "cp", "data-mode": q.mode });
      root.append(el);

      el.append(h("div", { class: "cp-clues card" }, ...q.weighings.map(miniScale)));
      el.append(h("div", { class: "cp-ask" }, q.mode === "heaviest" ? STR.askHeaviest : q.mode === "lightest" ? STR.askLightest : STR.askOrder));
      answerEl = h("div", { class: "cp-answer" });
      el.append(answerEl);

      if (isOrder()) {
        paintOrder();
        const done = h("button", { class: "btn btn-primary cp-done", id: "xong" }, html(ICON.check), STR.done);
        done.addEventListener("click", () => {
          if (picked.length < q.items.length) {
            // not finished: say what to do instead of counting a wrong answer
            answerEl.classList.add("shake");
            setTimeout(() => answerEl.classList.remove("shake"), 450);
            api.speak(say("cmp_order"));
            return;
          }
          api.submit([...picked]);
        });
        el.append(done);
      } else {
        answerEl.append(choices(120));
      }
    },

    async playResult(fb) {
      if (isOrder()) {
        firstWrong = (fb.result.data?.firstWrong as number | undefined) ?? 0;
        paintOrder("result");
      } else {
        answerEl.querySelector(`.cp-choice[data-k="${lastPick}"]`)?.classList.add(fb.result.correct ? "right" : "wrong");
      }
      await wait(750);
    },

    reset() {
      if (isOrder()) {
        picked = picked.slice(0, firstWrong); // keep the correct start of the row; fix the rest
        paintOrder();
      } else {
        answerEl.querySelectorAll(".cp-choice").forEach((c) => c.classList.remove("right", "wrong"));
      }
    },

    async reveal(answer) {
      if (isOrder()) {
        picked = [...(answer as Box[])];
        paintOrder("reveal");
      } else {
        answerEl.querySelectorAll(".cp-choice").forEach((c) => c.classList.remove("wrong"));
        answerEl.querySelector(`.cp-choice[data-k="${answer as Box}"]`)?.classList.add("right");
      }
      await wait(1300);
    },

    unmount() {
      /* plain click handlers on elements that are removed with the view */
    },
  };
}
