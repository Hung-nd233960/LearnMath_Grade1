// View for "Giải mã hình": each fruit stands for a number.
//   Vòng 1  the values are shown in "Bảng số"; fill in several rows
//   Vòng 2  longer sums, or find a fruit's value from a clue
//   Vòng 3  a chain of clues ("Manh mối 1, 2, 3"): solve one, use it in the next
// The rows carry data attributes (fruits, total, ask) so a test can solve the puzzle from the screen.
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import type { EquationsAnswer, EquationsQuestion, Fruit } from "../../games/equations/logic.ts";
import { emoji, h, html, wait } from "../dom.ts";
import { ICON } from "../icons.ts";
import { boxValue, createNumpad, setBox, type Numpad } from "../numpad.ts";
import type { GameView } from "./types.ts";
import "./equations.css";

/** 🍎 + 🍐 + 🍉 as pictures with "+" between. */
function terms(fruits: readonly Fruit[], size: number): (HTMLElement | string)[] {
  return fruits.flatMap((f, i) => [...(i > 0 ? [h("span", { class: "op" }, "+")] : []), emoji(f, size)]);
}

/** A first digit of 2–9 can only be a one-digit answer (sums stay within 20), so the next box can take over. */
function isComplete(value: string): boolean {
  return value.length >= 2 || (value !== "" && value !== "1");
}

export function createEquationsView(): GameView<EquationsQuestion, EquationsAnswer> {
  let q: EquationsQuestion;
  let boxes: HTMLElement[] = [];
  let numpad: Numpad | null = null;
  let wrongRows: number[] = [];

  /** The first box that is neither locked (already right) nor filled, or the first unlocked one. */
  const nextBox = (): HTMLElement | null =>
    boxes.find((b) => !b.classList.contains("locked") && !b.dataset.v) ?? boxes.find((b) => !b.classList.contains("locked")) ?? null;

  return {
    mount(el, question, api) {
      q = question;
      wrongRows = [];
      boxes = [];
      const multi = q.asks.length > 1;
      const board = h("div", { class: "eq-board card" });

      if (q.known.length) {
        board.append(h("div", { class: "eq-known" },
          h("b", null, STR.eqKnown),
          ...q.known.map((k) => h("span", { class: "kv", "data-fruit": k.fruit, "data-value": k.value }, emoji(k.fruit, 46), `= ${k.value}`))));
      }
      q.clues.forEach((clue, i) => {
        board.append(h("div", { class: "eq-row clue", "data-fruits": clue.terms.join(","), "data-total": clue.total },
          h("span", { class: "tag" }, emoji("magnifying_glass_tilted_left", 30), STR.eqClue(i + 1)),
          ...terms(clue.terms, 76),
          h("span", { class: "op" }, "="),
          h("span", { class: "num" }, clue.total)));
      });
      q.asks.forEach((ask, i) => {
        const box = h("span", { class: "answer-box", "data-row": i });
        if (i === 0) box.id = "eq-answer";
        boxes.push(box);
        board.append(h("div", { class: `eq-row q${multi ? " multi" : ""}`, "data-ask": ask.terms.join(","), "data-row": i },
          multi ? "" : h("span", { class: "tag" }, emoji("thinking_face", 34), STR.eqQuestion),
          ...terms(ask.terms, multi ? 68 : 76),
          h("span", { class: "op" }, "="),
          box));
      });

      const pad = h("div", { id: "numpad" });
      const done = h("button", { class: "btn btn-primary", id: "xong" }, html(ICON.check), STR.done);
      const root = h("div", { class: "eq" }, board, h("div", { class: "eq-side" }, pad, done));
      el.append(root);

      numpad = createNumpad(pad, {
        scope: root,
        // after a complete number, the next empty row takes over
        onChange: (box) => {
          if (boxes.length > 1 && isComplete(box.dataset.v ?? "")) {
            const next = boxes.find((b) => b !== box && !b.classList.contains("locked") && !b.dataset.v);
            if (next) numpad?.activate(next);
          }
        },
      });
      numpad.activate(boxes[0]!);

      done.addEventListener("click", () => {
        const blanks = boxes.filter((b) => boxValue(b) === undefined);
        if (blanks.length) {
          blanks.forEach((b) => b.classList.add("shake"));
          setTimeout(() => blanks.forEach((b) => b.classList.remove("shake")), 450);
          numpad?.activate(blanks[0]!);
          api.speak(say("pick_number"));
          return;
        }
        api.submit(boxes.map((b) => boxValue(b) ?? null));
      });
    },

    async playResult(fb) {
      const wrong = fb.result.correct ? [] : ((fb.result.data?.wrongRows as number[] | undefined) ?? boxes.map((_, i) => i));
      wrongRows = wrong;
      boxes.forEach((b, i) => {
        b.classList.toggle("right", !wrong.includes(i));
        b.classList.toggle("wrong", wrong.includes(i));
      });
      await wait(750);
    },

    reset() {
      // rows that were right stay filled, green and locked; only the wrong rows are cleared
      boxes.forEach((b, i) => {
        if (wrongRows.includes(i)) {
          b.classList.remove("right", "wrong");
          setBox(b, "");
        } else if (b.classList.contains("right")) {
          b.classList.add("locked");
        }
      });
      numpad?.activate(nextBox());
    },

    async reveal(answer) {
      boxes.forEach((b, i) => {
        setBox(b, String(answer[i] ?? ""));
        b.classList.remove("wrong");
        b.classList.add("right");
      });
      await wait(1300);
    },

    unmount() {
      numpad?.dispose();
      numpad = null;
      boxes = [];
    },
  };
}
