// View for "Cái cân": make both pans weigh the same by adding fruit from the tray.
//   Vòng 1  one fruit; the scale tips live, each pan shows its count and a >, <, = sign
//   Vòng 2  two kinds of fruit with a weight table; a padlock holds the scale level until "Xong"
//   Vòng 3  three kinds (grapes 1, apple 2, watermelon 3)
// Fruit already on the pans is fixed; the child's own fruit can go on either pan or back to the tray.
import { STR } from "../../i18n/ui.ts";
import { compareSign, WEIGHT, type Fruit, type ScaleAnswer, type ScaleQuestion } from "../../games/scale/logic.ts";
import { emoji, emojiSrc, h, html, wait } from "../dom.ts";
import { dragTap } from "../dragTap.ts";
import { ICON } from "../icons.ts";
import type { GameView } from "./types.ts";
import "./scale.css";

type Side = "L" | "R";

const BEAM = `<svg width="700" height="40" viewBox="0 0 700 40">
  <rect x="22" y="8" width="656" height="24" rx="12" fill="url(#brass)" stroke="#1e2a4a" stroke-width="4"/>
  <rect x="38" y="12" width="624" height="5" rx="2.5" fill="#fff6cf" opacity=".8"/>
  <g fill="#1e2a4a" opacity=".55"><circle cx="110" cy="24" r="3"/><circle cx="190" cy="24" r="3"/><circle cx="270" cy="24" r="3"/><circle cx="430" cy="24" r="3"/><circle cx="510" cy="24" r="3"/><circle cx="590" cy="24" r="3"/></g>
  <circle cx="30" cy="20" r="11" fill="url(#brass)" stroke="#1e2a4a" stroke-width="4"/><circle cx="670" cy="20" r="11" fill="url(#brass)" stroke="#1e2a4a" stroke-width="4"/></svg>`;

const STAND = `<svg class="sc-stand" width="180" height="290" viewBox="0 0 180 290">
  <path d="M78 0 H102 L114 236 H66 Z" fill="url(#brassV)" stroke="#1e2a4a" stroke-width="4" stroke-linejoin="round"/>
  <path d="M86 8 L80 228" stroke="#fff6cf" stroke-width="4" stroke-linecap="round" opacity=".7"/>
  <rect x="70" y="72" width="40" height="12" rx="6" fill="url(#brass)" stroke="#1e2a4a" stroke-width="3.5"/>
  <rect x="64" y="160" width="52" height="13" rx="6.5" fill="url(#brass)" stroke="#1e2a4a" stroke-width="3.5"/>
  <rect x="24" y="230" width="132" height="26" rx="10" fill="url(#wood)" stroke="#1e2a4a" stroke-width="4"/>
  <rect x="6" y="252" width="168" height="32" rx="14" fill="url(#wood)" stroke="#1e2a4a" stroke-width="4"/>
  <rect x="34" y="236" width="96" height="5" rx="2.5" fill="#e3b583"/><rect x="20" y="259" width="120" height="5" rx="2.5" fill="#c98a4f"/></svg>`;

const CHAINS = `<svg class="str" viewBox="0 0 290 260"><path d="M145 4 L26 198 M145 4 L264 198" stroke="#8a6526" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 8"/><circle cx="145" cy="6" r="7" fill="url(#brass)" stroke="#1e2a4a" stroke-width="3.5"/></svg>`;
const BOWL = `<svg class="bowl" width="290" height="72" viewBox="0 0 290 72"><path d="M6 12 H284 Q268 68 145 68 Q22 68 6 12 Z" fill="url(#bowlG)" stroke="#1e2a4a" stroke-width="6" stroke-linejoin="round"/><path d="M44 30 Q145 52 246 30" stroke="#fff6cf" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/><rect x="2" y="5" width="286" height="14" rx="7" fill="#ffd86b" stroke="#1e2a4a" stroke-width="5"/></svg>`;

const fruitEl = (kind: Fruit, fixed: boolean) =>
  h("div", { class: "sc-fruit", "data-item": true, "data-fixed": fixed, "data-k": kind, "data-w": WEIGHT[kind] }, emoji(kind, 58));

export function createScaleView(): GameView<ScaleQuestion, ScaleAnswer> {
  let q: ScaleQuestion;
  let beam: HTMLElement;
  let lock: HTMLElement;
  let sign: HTMLElement;
  const pan = {} as Record<Side, HTMLElement>;
  let tray: HTMLElement;
  let stopDrag: (() => void) | null = null;

  const fz = (zone: HTMLElement) => (zone.classList.contains("sc-fz") ? zone : zone.querySelector<HTMLElement>(".sc-fz")!);
  const itemsIn = (zone: HTMLElement) => [...fz(zone).querySelectorAll<HTMLElement>("[data-item]")];
  const weightOf = (zone: HTMLElement) => itemsIn(zone).reduce((s, i) => s + Number(i.dataset.w), 0);
  const addedIn = (s: Side) => itemsIn(pan[s]).filter((i) => !i.hasAttribute("data-fixed")).map((i) => i.dataset.k as Fruit);

  /** Tip the beam to show the weights (show = true), or hold it level (show = false: the padlock). */
  function tilt(show: boolean) {
    const L = weightOf(pan.L), R = weightOf(pan.R);
    const deg = show ? Math.max(-12, Math.min(12, (L - R) * -3.5)) : 0;
    const dy = 320 * Math.sin((deg * Math.PI) / 180);
    beam.style.transform = `rotate(${deg}deg)`;
    pan.L.style.transform = `translateY(${-dy}px)`;
    pan.R.style.transform = `translateY(${dy}px)`;
    lock.classList.toggle("off", show || q.liveTilt);
    if (q.showCounts) {
      const nL = itemsIn(pan.L).length, nR = itemsIn(pan.R).length;
      pan.L.querySelector(".sc-count")!.textContent = String(nL);
      pan.R.querySelector(".sc-count")!.textContent = String(nR);
      // Vòng 1 also shows the comparison sign children learn in grade 1
      const symbol = compareSign(nL, nR);
      if (sign.textContent !== symbol) {
        sign.textContent = symbol;
        sign.classList.remove("pop");
        void sign.offsetWidth; // restart the pop animation
        sign.classList.add("pop");
      }
      sign.classList.toggle("eq", symbol === "=");
      sign.hidden = false;
    }
    return { L, R };
  }

  function buildPan(s: Side): HTMLElement {
    return h("div", { class: `sc-pan ${s}`, "data-zone": s }, html(CHAINS), h("div", { class: "sc-fz" }), html(BOWL), h("div", { class: "sc-count" }));
  }

  return {
    mount(root, question, api) {
      q = question;
      const el = h("div", { class: "sc" });
      root.append(el);

      const key = h("div", { class: "sc-key card" }, h("h3", null, STR.scaleKey),
        ...q.key.map((k) => h("div", { class: "row" }, emoji(k, 46), `= ${WEIGHT[k]}`)));
      if (!q.key.length) key.style.display = "none";

      beam = h("div", { class: "sc-beam" }, html(BEAM));
      lock = h("img", { class: "emo sc-lock off", src: emojiSrc("locked"), width: 60, height: 60, alt: "", title: STR.scaleLockTip });
      sign = h("div", { class: "sc-sign" });
      sign.hidden = true;
      pan.L = buildPan("L");
      pan.R = buildPan("R");
      for (const k of q.left) fz(pan.L).append(fruitEl(k, true));
      for (const k of q.right) fz(pan.R).append(fruitEl(k, true));

      const done = h("button", { class: "btn btn-primary", id: "xong" }, html(ICON.check), STR.done);
      const trayFz = h("div", { class: "sc-fz", "data-zone": "tray" });
      for (const k of q.tray) trayFz.append(fruitEl(k, false));
      tray = h("div", { class: "sc-tray card" }, h("div", { class: "lbl" }, STR.scaleTray), trayFz, done);

      el.append(key, h("div", { class: "sc-ground" }), html(STAND), beam, h("div", { class: "sc-pivot" }), sign, lock, pan.L, pan.R, tray);
      tilt(q.liveTilt);

      stopDrag = dragTap({ root: el, onMove: (item, zone) => { fz(zone).append(item); tilt(q.liveTilt); } });
      done.addEventListener("click", () => api.submit({ addedLeft: addedIn("L"), addedRight: addedIn("R") }));
    },

    async playResult() {
      tilt(true); // the padlock opens and the beam tips to show who is heavier
      await wait(900);
    },

    reset() {
      tilt(q.liveTilt); // hold it level again so the child can fix it
    },

    async reveal(answer) {
      const trayFz = fz(tray);
      for (const s of ["L", "R"] as const) for (const item of itemsIn(pan[s]).filter((i) => !i.hasAttribute("data-fixed"))) trayFz.append(item);
      for (const [s, kinds] of [["L", answer.addedLeft], ["R", answer.addedRight]] as const) {
        for (const kind of kinds) {
          const item = itemsIn(tray).find((i) => i.dataset.k === kind);
          if (item) {
            fz(pan[s]).append(item);
            tilt(q.liveTilt);
            await wait(250);
          }
        }
      }
      tilt(true);
      await wait(1100);
    },

    unmount() {
      stopDrag?.();
      stopDrag = null;
    },
  };
}
