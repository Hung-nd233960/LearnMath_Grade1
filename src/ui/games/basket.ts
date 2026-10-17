// View for "Giỏ trái cây": Mèo asks for an exact amount; the child moves fruit (and bags of ten)
// from their own basket to Mèo's basket.
//   Vòng 1  one kind, few fruit; each basket shows a live count
//   Vòng 2  bags of 10 teach "chục" (một chục, hai chục, mười, mười ba …)
//   Vòng 3  two kinds at once, or "không quả chuối" (an empty basket is right)
// The request is also shown in pictures when sound is off, or after a wrong try.
import { STR } from "../../i18n/ui.ts";
import { BAG_SIZE, FRUITS, type BasketAnswer, type BasketQuestion, type Fruit } from "../../games/basket/logic.ts";
import { sfx } from "../../audio/sfx.ts";
import { emoji, h, html, wait } from "../dom.ts";
import { sparkle } from "../effects.ts";
import { dragTap } from "../dragTap.ts";
import { ICON } from "../icons.ts";
import { mascot, setMood } from "../mascot.ts";
import { BASKET_ART } from "./art.ts";
import type { GameView } from "./types.ts";
import "./basket.css";

type Side = "L" | "R";

const fruitEl = (kind: Fruit) => h("div", { class: "bk-fruit", "data-item": true, "data-k": kind, "data-n": 1 }, emoji(kind, 56));

/** A bag of ten oranges: one item that counts as 10. */
const bagEl = () =>
  h("div", { class: "bk-bag", "data-item": true, "data-bag": true, "data-k": "tangerine", "data-n": BAG_SIZE },
    ...Array.from({ length: BAG_SIZE }, () => emoji("tangerine", 22)), h("b", null, BAG_SIZE));

export function createBasketView(): GameView<BasketQuestion, BasketAnswer> {
  let q: BasketQuestion;
  let el: HTMLElement;
  let meo: HTMLElement;
  const side = {} as Record<Side, HTMLElement>;
  let panel: HTMLElement;
  let stopDrag: (() => void) | null = null;
  let unsubscribe: (() => void) | null = null;
  let api: Parameters<GameView<BasketQuestion, BasketAnswer>["mount"]>[2];

  const fz = (s: Side) => side[s].querySelector<HTMLElement>(".bk-fz")!;
  const items = (s: Side) => [...fz(s).querySelectorAll<HTMLElement>("[data-item]")];

  /** What is in a basket, counted by kind (a bag counts as ten oranges). */
  const tally = (s: Side) => {
    const t: Partial<Record<Fruit, number>> = {};
    for (const i of items(s)) t[i.dataset.k as Fruit] = (t[i.dataset.k as Fruit] ?? 0) + Number(i.dataset.n);
    return t;
  };

  function paintCounts() {
    if (!q.showCounts) return;
    for (const s of ["L", "R"] as const) {
      const t = tally(s);
      const kinds = FRUITS.filter((k) => k in t);
      const show = kinds.length ? kinds : [q.order[0]!];
      const box = side[s].querySelector<HTMLElement>(".bk-counts")!;
      const before = box.textContent;
      box.replaceChildren(...show.map((k) => h("span", { "data-k": k }, emoji(k, 30), t[k] ?? 0)));
      if (before && before !== box.textContent) box.querySelectorAll("span").forEach((c) => c.classList.add("bump"));
    }
  }

  function buildBasket(s: Side, name: string): HTMLElement {
    const b = h("div", { class: `bk-basket ${s}`, "data-zone": s },
      h("div", { class: "bk-name" }, name),
      h("div", { class: "bk-fz" }),
      html(`<svg class="bk-front" width="450" height="178" viewBox="0 0 480 190">${BASKET_ART}</svg>`),
      h("div", { class: "bk-counts" }));
    return b;
  }

  /** The request as numbers with pictures: "3 🍊", "2 🍊 và 3 🍎"; in Vòng 2 the bags are shown underneath: "[10] + 3 🍊". */
  function buildPanel(): HTMLElement {
    const p = h("div", { class: "bk-panel card" });
    const main = h("div", { class: "row" });
    q.order.forEach((k, i) => {
      if (i > 0) main.append(h("span", { class: "plus" }, STR.and));
      main.append(h("div", { class: "grp" }, h("span", { class: "num" }, q.want[k] ?? 0), emoji(k, 52)));
    });
    p.append(main);
    if (q.tens) {
      const t = q.tens;
      const bags = Array.from({ length: t.tens }, () => h("span", { class: "bk-minibag" }, emoji("tangerine", 20), h("b", null, BAG_SIZE)));
      p.append(h("div", { class: "row sub" }, ...bags,
        ...(t.ones ? [h("span", { class: "plus" }, "+"), h("div", { class: "grp small" }, h("span", { class: "num" }, t.ones), emoji("tangerine", 34))] : [])));
    }
    return p;
  }

  const syncPanel = () => panel.classList.toggle("show", api.ctx.store.data.settings.muted || api.wrongTries() >= 1);

  function move(item: HTMLElement, to: Side) {
    fz(to).append(item);
    paintCounts();
  }

  return {
    ownPrompt: true,

    mount(root, question, a) {
      q = question;
      api = a;
      el = h("div", { class: "bkv" });
      root.append(el);

      meo = mascot("normal");
      const replay = h("button", { class: "replay", title: STR.replay, onclick: () => a.replayPrompt() });
      replay.innerHTML = ICON.replay;
      const ask = h("div", { class: "bk-ask", "data-want": JSON.stringify(q.want), "data-tens": q.tens?.kind ?? "" }, meo, h("div", { class: "bubble" }, h("span", null, a.prompt.text), replay));
      panel = buildPanel();
      side.L = buildBasket("L", STR.basketMine);
      side.R = buildBasket("R", STR.basketMeo);
      const done = h("button", { class: "btn btn-primary bk-done", id: "xong" }, html(ICON.check), STR.done);
      el.append(ask, panel, side.L, side.R, done);

      // the child's own basket: bags first, then loose fruit
      for (let i = 0; i < q.bags; i++) fz("L").append(bagEl());
      for (const kind of FRUITS) for (let i = 0; i < (q.loose[kind] ?? 0); i++) fz("L").append(fruitEl(kind));
      paintCounts();

      stopDrag = dragTap({ root: el, onMove: (item, zone) => move(item, zone.dataset.zone as Side) });
      syncPanel();
      unsubscribe = a.ctx.store.subscribe(syncPanel); // the speaker can be switched off mid-question

      done.addEventListener("click", () => {
        const answer: BasketAnswer = { loose: {}, bags: 0 };
        for (const i of items("R")) {
          if (i.hasAttribute("data-bag")) answer.bags++;
          else answer.loose[i.dataset.k as Fruit] = (answer.loose[i.dataset.k as Fruit] ?? 0) + 1;
        }
        a.submit(answer);
      });
    },

    async playResult(fb) {
      setMood(meo, fb.result.correct ? "happy" : "think");
      side.R.classList.add(fb.result.correct ? "right" : "wrong");
      await wait(750);
      side.R.classList.remove("right", "wrong");
    },

    reset() {
      // keep the fruit where the child put it: they fix it by moving fruit back or adding more
      setMood(meo, "normal");
      syncPanel();
    },

    async reveal(answer) {
      for (const i of items("R")) move(i, "L");
      let bags = answer.bags;
      for (const i of items("L").filter((x) => x.hasAttribute("data-bag"))) {
        if (bags-- > 0) move(i, "R");
      }
      for (const kind of FRUITS) {
        let n = answer.loose[kind] ?? 0;
        for (const i of items("L").filter((x) => !x.hasAttribute("data-bag") && x.dataset.k === kind)) {
          if (n-- <= 0) break;
          move(i, "R");
          sfx.play("drop");
          sparkle(api.ctx.stage.el, i, 3, 36);
          await wait(110);
        }
      }
      side.R.classList.add("right");
      await wait(1100);
    },

    unmount() {
      stopDrag?.();
      stopDrag = null;
      unsubscribe?.();
      unsubscribe = null;
    },
  };
}
