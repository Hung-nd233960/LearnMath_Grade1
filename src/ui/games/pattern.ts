// View for "Quy luật": a row (or a 3×3 grid) with one blank; the child taps the picture that keeps the rule going,
// or drags it onto the blank, and presses "Xong". Pictures are fruit, plain shapes, numbers, a dot on a frame, or
// a shape inside a shape. Every token carries its data-k (see tokenKey) so a test can solve the puzzle from the screen.
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { tokenKey, type PatternAnswer, type PatternQuestion, type ShapeId, type Token } from "../../games/pattern/logic.ts";
import { emoji, h, html, wait } from "../dom.ts";
import { dragTap } from "../dragTap.ts";
import { ICON } from "../icons.ts";
import type { GameView } from "./types.ts";
import "./pattern.css";

const COLORS = ["#ef5b5b", "#3f8cff", "#2fbf71"] as const;
const NAVY = "#1e2a4a";

/** One shape as SVG markup, centred on (cx, cy) with "radius" r. */
function shapeSvg(shape: ShapeId, cx: number, cy: number, r: number, fill: string, sw: number): string {
  const a = `fill="${fill}" stroke="${NAVY}" stroke-width="${sw}" stroke-linejoin="round"`;
  if (shape === "circle") return `<circle cx="${cx}" cy="${cy}" r="${r}" ${a}/>`;
  if (shape === "square") return `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${r * 0.14}" ${a}/>`;
  const h3 = r * 1.7;
  return `<polygon points="${cx},${cy - h3 * 0.6} ${cx + r * 1.08},${cy + h3 * 0.4} ${cx - r * 1.08},${cy + h3 * 0.4}" ${a}/>`;
}

const DIAMOND = [[50, 10], [90, 50], [50, 90], [10, 50]] as const; // top, right, bottom, left
const SQUARE = [[18, 18], [82, 18], [82, 82], [18, 82]] as const; // top-left, top-right, bottom-right, bottom-left

/** A token drawn at `size` pixels. */
export function renderToken(t: Token, size: number): HTMLElement {
  const box = h("div", { class: `pt-tok ${t.kind}`, style: `width:${size}px;height:${size}px` });
  if (t.kind === "fruit") box.append(emoji(t.fruit, Math.round(size * 0.82)));
  else if (t.kind === "num") {
    box.textContent = String(t.n);
    box.style.fontSize = `${Math.round(size * 0.58)}px`;
  } else if (t.kind === "shape") {
    box.append(html(`<svg viewBox="0 0 100 100" width="${size}" height="${size}">${shapeSvg(t.shape, 50, 54, 34, COLORS[t.color], 5)}</svg>`));
  } else if (t.kind === "dot") {
    const frame = t.frame === "diamond"
      ? `<polygon points="50,10 90,50 50,90 10,50" fill="#eaf7ee" stroke="#2f8a4c" stroke-width="7" stroke-linejoin="round"/>`
      : `<rect x="18" y="18" width="64" height="64" rx="6" fill="#eaf7ee" stroke="#2f8a4c" stroke-width="7"/>`;
    const [x, y] = (t.frame === "diamond" ? DIAMOND : SQUARE)[t.corner];
    box.append(html(`<svg viewBox="0 0 100 100" width="${size}" height="${size}">${frame}<circle cx="${x}" cy="${y}" r="10" fill="#2f6fe0" stroke="#fff" stroke-width="3"/></svg>`));
  } else {
    box.append(html(`<svg viewBox="0 0 100 100" width="${size}" height="${size}">${shapeSvg(t.outer, 50, 52, 40, "#e6eefc", 5)}${shapeSvg(t.inner, 50, t.outer === "triangle" ? 60 : 52, 15, "#2f6fe0", 4)}</svg>`));
  }
  return box;
}

export function createPatternView(): GameView<PatternQuestion, PatternAnswer> {
  let q: PatternQuestion;
  let blank: HTMLElement;
  let size = 86;
  let picked: number | null = null;
  let optEls: HTMLElement[] = [];
  let stopDrag: (() => void) | null = null;

  /** Put option i in the blank (the child can change their mind and pick another). */
  function pick(i: number) {
    picked = i;
    blank.replaceChildren(renderToken(q.options[i]!, size));
    blank.dataset.k = tokenKey(q.options[i]!);
    blank.classList.add("filled");
    optEls.forEach((o, j) => o.classList.toggle("picked", j === i));
  }

  function clearBlank() {
    picked = null;
    blank.replaceChildren(h("span", { class: "q" }, "?"));
    delete blank.dataset.k;
    blank.classList.remove("filled", "right", "wrong");
    optEls.forEach((o) => o.classList.remove("picked", "right", "wrong"));
  }

  return {
    mount(el, question, api) {
      q = question;
      const grid = q.kind === "grid";
      const n = q.items.length;
      size = grid ? 124 : n > 8 ? 82 : 92;
      picked = null;

      const board = h("div", { class: `pt-board${grid ? " grid" : ""}` });
      blank = h("div", { class: "pt-blank", "data-zone": "blank" }, h("span", { class: "q" }, "?"));
      blank.style.width = blank.style.height = `${size}px`;
      q.items.forEach((t, i) => {
        if (!t) board.append(blank);
        else board.append(h("div", { class: "pt-item", "data-i": i, "data-k": tokenKey(t) }, renderToken(t, size)));
      });
      board.append(h("div", { class: "pt-star" }, emoji("glowing_star", 56)));

      optEls = q.options.map((o, i) =>
        h("button", { class: "pt-opt", "data-item": true, "data-i": i, "data-k": tokenKey(o), onclick: () => pick(i) }, renderToken(o, 108)));
      const options = h("div", { class: `pt-options${grid ? " grid" : ""}` }, ...optEls);

      const done = h("button", { class: "btn btn-primary", id: "xong" }, html(ICON.check), STR.done);
      done.addEventListener("click", () => {
        if (picked === null) {
          // nothing chosen yet: say what to do instead of counting a wrong try
          blank.classList.add("shake");
          setTimeout(() => blank.classList.remove("shake"), 450);
          api.speak(say(q.kind === "number" ? "pattern_number" : "pattern_prompt"));
          return;
        }
        api.submit(picked);
      });

      const root = h("div", { class: "pt", "data-kind": q.kind }, board, options, done);
      el.append(root);
      stopDrag = dragTap({ root, onMove: (item, zone) => { if (zone.dataset.zone === "blank") pick(Number(item.dataset.i)); } });
    },

    async playResult(fb) {
      blank.classList.add(fb.result.correct ? "right" : "wrong");
      if (picked !== null) optEls[picked]!.classList.add(fb.result.correct ? "right" : "wrong");
      await wait(750);
    },

    reset: clearBlank,

    async reveal(answer) {
      clearBlank();
      pick(answer);
      blank.classList.add("right");
      optEls[answer]!.classList.add("right");
      await wait(1300);
    },

    unmount() {
      stopDrag?.();
      stopDrag = null;
    },
  };
}
