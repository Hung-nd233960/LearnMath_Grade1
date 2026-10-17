// View for "Tính theo hình": each fruit stands for a number.
//   Vòng 1  the values are shown in "Bảng số"; add the fruit up
//   Vòng 2  longer sums, or find a fruit's value from a clue
//   Vòng 3  a chain of clues ("Manh mối 1, 2, 3"): solve one, use it in the next
// The rows carry data attributes (fruits, total) so a test can solve the puzzle from the screen.
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import type { EquationsQuestion, Fruit } from "../../games/equations/logic.ts";
import { emoji, h, html, wait } from "../dom.ts";
import { ICON } from "../icons.ts";
import { boxValue, createNumpad, setBox, type Numpad } from "../numpad.ts";
import type { GameView } from "./types.ts";
import "./equations.css";

/** 🍎 + 🍐 + 🍉 as pictures with "+" between. */
function terms(fruits: readonly Fruit[]): (HTMLElement | string)[] {
  return fruits.flatMap((f, i) => [...(i > 0 ? [h("span", { class: "op" }, "+")] : []), emoji(f, 76)]);
}

export function createEquationsView(): GameView<EquationsQuestion, number> {
  let q: EquationsQuestion;
  let box: HTMLElement;
  let numpad: Numpad | null = null;

  return {
    mount(el, question, api) {
      q = question;
      const board = h("div", { class: "eq-board card" });

      if (q.known.length) {
        board.append(h("div", { class: "eq-known" },
          h("b", null, STR.eqKnown),
          ...q.known.map((k) => h("span", { class: "kv", "data-fruit": k.fruit, "data-value": k.value }, emoji(k.fruit, 46), `= ${k.value}`))));
      }
      q.clues.forEach((clue, i) => {
        board.append(h("div", { class: "eq-row clue", "data-fruits": clue.terms.join(","), "data-total": clue.total },
          h("span", { class: "tag" }, emoji("magnifying_glass_tilted_left", 30), STR.eqClue(i + 1)),
          ...terms(clue.terms),
          h("span", { class: "op" }, "="),
          h("span", { class: "num" }, clue.total)));
      });
      box = h("span", { class: "answer-box", id: "eq-answer" });
      board.append(h("div", { class: "eq-row q", "data-ask": q.ask.join(",") },
        h("span", { class: "tag" }, emoji("thinking_face", 34), STR.eqQuestion),
        ...terms(q.ask),
        h("span", { class: "op" }, "="),
        box));

      const pad = h("div", { id: "numpad" });
      const done = h("button", { class: "btn btn-primary", id: "xong" }, html(ICON.check), STR.done);
      const root = h("div", { class: "eq" }, board, h("div", { class: "eq-side" }, pad, done));
      el.append(root);

      numpad = createNumpad(pad, { scope: root });
      numpad.activate(box);

      done.addEventListener("click", () => {
        const v = boxValue(box);
        if (v === undefined) {
          box.classList.add("shake");
          setTimeout(() => box.classList.remove("shake"), 450);
          api.speak(say("pick_number"));
          return;
        }
        api.submit(v);
      });
    },

    async playResult(fb) {
      box.classList.add(fb.result.correct ? "right" : "wrong");
      await wait(750);
    },

    reset() {
      box.classList.remove("right", "wrong");
      setBox(box, "");
      numpad?.activate(box);
    },

    async reveal(answer) {
      setBox(box, String(answer));
      box.classList.remove("wrong");
      box.classList.add("right");
      await wait(1300);
    },

    unmount() {
      numpad?.dispose();
      numpad = null;
    },
  };
}
