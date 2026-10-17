// View for "Mấy và mấy": count a picture and/or fill the missing number of a number bond.
//   Vòng 1  picture, one blank (the total)
//   Vòng 2  picture + a small number bond that mirrors the typed numbers, two blanks
//   Vòng 3  a big number bond only, one missing part
import { sfx } from "../../audio/sfx.ts";
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { SCENES, type SplitAnswer, type SplitQuestion, type Slot } from "../../games/split/logic.ts";
import { sentence } from "../../games/split/text.ts";
import { emoji, h, html, wait } from "../dom.ts";
import { ICON } from "../icons.ts";
import { boxValue, createNumpad, setBox, type Numpad } from "../numpad.ts";
import { createBond, type Bond } from "./bond.ts";
import { basketSpots, ITEM, vaseSpots } from "./splitLayout.ts";
import type { GameView } from "./types.ts";
import "./split.css";

const VASE_ART = `<defs><clipPath id="vaseClip"><path d="M188 412 Q186 438 156 456 Q110 484 114 524 Q118 560 176 570 H284 Q342 560 346 524 Q350 484 304 456 Q274 438 272 412 Z"/></clipPath></defs>
  <rect x="0" y="566" width="460" height="42" fill="url(#wood)"/><rect x="0" y="566" width="460" height="7" fill="#e3b583"/>
  <ellipse cx="230" cy="572" rx="104" ry="9" fill="rgba(30,42,74,.22)"/>
  <path d="M188 412 Q186 438 156 456 Q110 484 114 524 Q118 560 176 570 H284 Q342 560 346 524 Q350 484 304 456 Q274 438 272 412 Z" fill="url(#ceramic)"/>
  <g clip-path="url(#vaseClip)">
    <path d="M100 498 Q230 530 360 498" stroke="#fff7e6" stroke-width="22" fill="none"/>
    <path d="M100 498 Q230 530 360 498" stroke="#f08aa0" stroke-width="4" fill="none" stroke-dasharray="2 14" stroke-linecap="round"/>
    <path d="M104 482 Q230 512 356 482 M104 516 Q230 548 356 516" stroke="#ffc53d" stroke-width="4" fill="none"/>
    <g transform="translate(230 540)"><circle r="7" fill="#ffc53d"/><g fill="#fff7e6"><circle cx="0" cy="-12" r="7"/><circle cx="11" cy="-4" r="7"/><circle cx="7" cy="10" r="7"/><circle cx="-7" cy="10" r="7"/><circle cx="-11" cy="-4" r="7"/></g><circle r="6" fill="#ffc53d"/></g>
    <ellipse cx="152" cy="494" rx="13" ry="34" transform="rotate(18 152 494)" fill="#fff" opacity=".35"/>
    <rect x="100" y="556" width="260" height="20" fill="#1e5f7f" opacity=".35"/>
  </g>
  <path d="M188 412 Q186 438 156 456 Q110 484 114 524 Q118 560 176 570 H284 Q342 560 346 524 Q350 484 304 456 Q274 438 272 412 Z" fill="none" stroke="#1e2a4a" stroke-width="4.5" stroke-linejoin="round"/>
  <ellipse cx="230" cy="410" rx="54" ry="13" fill="#3d97bf" stroke="#1e2a4a" stroke-width="4.5"/>
  <ellipse cx="230" cy="410" rx="40" ry="7" fill="#1d5a78"/>`;

const TABLE_ART = `<rect x="0" y="566" width="460" height="42" fill="url(#wood)"/><rect x="0" y="566" width="460" height="7" fill="#e3b583"/>
  <ellipse cx="230" cy="568" rx="190" ry="9" fill="rgba(30,42,74,.22)"/>`;

const BASKET_ART = `<path d="M10 30 H470 L432 168 Q240 196 48 168 Z" fill="#3FA7B5"/>
  <g stroke="#2E8996" stroke-width="6"><path d="M22 70 H458M32 110 H448M42 148 H438"/></g>
  <g stroke="#5FC0CC" stroke-width="5"><path d="M80 32 L92 172M150 32 L156 178M220 32 L222 180M290 32 L286 180M360 32 L352 176M420 32 L404 172"/></g>
  <rect x="0" y="12" width="480" height="34" rx="17" fill="#23707C"/><rect x="10" y="18" width="460" height="10" rx="5" fill="#7FD3DC" opacity=".6"/>`;

export function createSplitView(): GameView<SplitQuestion, SplitAnswer> {
  let q: SplitQuestion;
  let boxes: Partial<Record<Slot, HTMLElement>> = {};
  let numpad: Numpad | null = null;
  let bond: Bond | null = null;
  let lastWrong: Slot[] = [];

  const refreshBond = () => {
    if (!bond) return;
    const text = (slot: Slot) => (q.blanks.includes(slot) ? (boxValue(boxes[slot]!)?.toString() ?? "?") : String(q[slot]));
    bond.set({ whole: text("whole"), a: text("a"), b: text("b") }, q.blanks);
  };

  /** The picture: a vase of flowers or a basket of fruit, each item tappable to mark it as counted. */
  function pictureScene(): HTMLElement {
    const scene = SCENES[q.scene];
    const el = h("div", { class: "sp-scene card", "data-mode": q.mode, "data-scene": q.scene });
    const spots = q.scene === "vase" ? vaseSpots(q.whole) : basketSpots(q.whole);
    const tipText = q.scene === "vase" ? STR.countTipFlowers : STR.countTipFruit;
    el.append(h("div", { class: "sp-tip" }, tipText));

    if (q.scene === "vase") {
      // stems first (behind the flowers), then the vase on top of their lower ends
      const stems = spots.map((s) => {
        const sy = 414, ey = s.y + 36;
        const qx = (230 + s.x) / 2, qy = (sy + ey) / 2 + 30;
        const lx = 0.25 * 230 + 0.5 * qx + 0.25 * s.x, ly = 0.25 * sy + 0.5 * qy + 0.25 * ey; // a leaf halfway up each stem
        const side = s.x < 230 ? -1 : 1;
        return `<path d="M${230 + (s.x - 230) * 0.08} ${sy} Q${qx} ${qy} ${s.x} ${ey}" stroke="#3f9a52" stroke-width="7" fill="none" stroke-linecap="round"/>
          <ellipse cx="${lx + side * 11}" cy="${ly}" rx="17" ry="7" transform="rotate(${side < 0 ? 35 : -35} ${lx + side * 11} ${ly})" fill="#5cbf6a" stroke="#3f9a52" stroke-width="3"/>`;
      }).join("");
      const stemLayer = html(`<svg width="460" height="608">${stems}</svg>`);
      el.append(stemLayer);
    }
    spots.forEach((s, i) => {
      const kind = q.layout[i]!;
      const item = h("div", { class: "sp-item", "data-kind": kind }, emoji(scene.kinds[kind], ITEM));
      item.style.left = `${s.x - ITEM / 2}px`;
      item.style.top = `${s.y - ITEM / 2}px`;
      el.append(item);
    });
    el.append(html(q.scene === "vase"
      ? `<svg width="460" height="608" style="pointer-events:none">${VASE_ART}</svg>`
      : `<svg width="460" height="608" style="pointer-events:none">${TABLE_ART}<g transform="translate(20 400) scale(0.875)">${BASKET_ART}</g></svg>`));
    el.addEventListener("click", (e) => {
      const item = (e.target as Element).closest(".sp-item");
      if (item) {
        item.classList.toggle("counted");
        sfx.play("pick");
      }
    });
    return el;
  }

  /** The fill-in sentence: given numbers are chips, blanks are answer boxes, items show which kind a number counts. */
  function sentenceCard(): HTMLElement {
    const card = h("div", { class: "sp-sent card" });
    const scene = SCENES[q.scene];
    for (const seg of sentence(q)) {
      if ("text" in seg) {
        card.append(seg.text + " ");
        continue;
      }
      if (q.blanks.includes(seg.slot)) {
        const box = h("span", { class: "answer-box", "data-slot": seg.slot });
        boxes[seg.slot] = box;
        card.append(box);
      } else {
        card.append(h("span", { class: "given" }, q[seg.slot]));
      }
      if (seg.kind !== undefined) card.append(" ", emoji(scene.kinds[seg.kind], 40), " ");
      else card.append(" ");
    }
    return card;
  }

  return {
    mount(el, question, api) {
      q = question;
      boxes = {};
      lastWrong = [];
      const root = h("div", { class: "sp", "data-mode": q.mode });
      el.append(root);

      const bondOnly = q.mode === "bond";
      if (bondOnly) {
        bond = createBond(400);
        root.append(h("div", { class: "sp-scene bond-only card", "data-mode": q.mode }, bond.el));
      } else {
        bond = null;
        root.append(pictureScene());
      }

      const right = h("div", { class: "sp-right" }, sentenceCard());
      if (q.mode === "picture+bond") {
        bond = createBond(270);
        right.append(h("div", { class: "sp-bond" }, bond.el));
      }
      const pad = h("div", { id: "numpad" });
      const done = h("button", { class: "btn btn-primary", id: "xong" }, html(ICON.check), STR.done);
      right.append(h("div", { class: "sp-bottom" }, pad, done));
      root.append(right);

      numpad = createNumpad(pad, { scope: root, onChange: refreshBond });
      const first = boxes[q.blanks[0]!];
      if (first) numpad.activate(first);
      refreshBond();

      done.addEventListener("click", () => {
        const answer: SplitAnswer = {};
        const missing: Slot[] = [];
        for (const slot of q.blanks) {
          const v = boxValue(boxes[slot]!);
          if (v === undefined) missing.push(slot);
          else answer[slot] = v;
        }
        if (missing.length) {
          // Not finished yet: nudge, do not count it as an answer.
          const box = boxes[missing[0]!]!;
          numpad?.activate(box);
          box.classList.add("shake");
          setTimeout(() => box.classList.remove("shake"), 450);
          api.speak(say("pick_number"));
          return;
        }
        api.submit(answer);
      });
    },

    async playResult(fb) {
      const wrong = (fb.result.data?.wrong as Slot[] | undefined) ?? [];
      lastWrong = fb.result.correct ? [] : wrong;
      for (const slot of q.blanks) boxes[slot]?.classList.add(wrong.includes(slot) && !fb.result.correct ? "wrong" : "right");
      await wait(750);
    },

    reset() {
      for (const slot of q.blanks) boxes[slot]?.classList.remove("right", "wrong");
      for (const slot of lastWrong) setBox(boxes[slot]!, "");
      const next = boxes[lastWrong[0] ?? q.blanks[0]!];
      if (next) numpad?.activate(next);
      refreshBond();
    },

    async reveal(answer) {
      for (const slot of q.blanks) {
        const box = boxes[slot]!;
        setBox(box, String(answer[slot] ?? q[slot]));
        box.classList.remove("wrong");
        box.classList.add("right");
      }
      refreshBond();
      await wait(1300);
    },

    unmount() {
      numpad?.dispose();
      numpad = null;
      bond = null;
    },
  };
}
