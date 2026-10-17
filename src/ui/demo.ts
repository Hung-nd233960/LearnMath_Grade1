// "Xem Mèo làm mẫu": plays a worked example (see games/demos.ts) on a sample question, over the play screen.
// The real game underneath is untouched: the demo mounts its own copy of the game view in a layer, and
// nothing it does is scored or saved. The ghost hand uses the same tap controls a child has.
import { createRng } from "../core/rng.ts";
import type { AnswerFeedback } from "../core/session.ts";
import type { GameMeta } from "../games/index.ts";
import { say } from "../i18n/speech.ts";
import { STR } from "../i18n/ui.ts";
import type { AppContext } from "./context.ts";
import { mountDecor } from "./decor.ts";
import { emojiSrc, h, wait, type Cleanup } from "./dom.ts";
import { DEMOS, type DemoHelpers } from "./games/demos.ts";
import { VIEWS } from "./games/index.ts";
import { mascot, mascotSVG } from "./mascot.ts";
import "./demo.css";

/** Where the fingertip is inside the hand picture (fractions of its size). */
const TIP = { x: 0.39, y: 0.08 };
const HAND = 110;
const MIN_LINE_MS = 1400; // a line stays on screen at least this long, even with no voice
const MOVE_MS = 750;

class Cancelled extends Error {}

export const hasDemo = (game: GameMeta): boolean => !!DEMOS[game.id] && !!VIEWS[game.id];

/** Start the demo. `onClose` runs when it ends or the child stops it. Returns a function that stops it. */
export function runDemo(ctx: AppContext, game: GameMeta, onClose: () => void): Cleanup {
  const script = DEMOS[game.id]!;
  const view = VIEWS[game.id]!();
  const q = game.logic.generate(script.pos, createRng(script.seed));
  const answer = game.logic.solve!(q);
  let cancelled = false;
  let closed = false;

  const layer = h("div", { class: "demo-layer screen-play" });
  layer.style.background = `var(${game.bgVar})`;
  mountDecor(layer, game.id);
  const body = h("div", { class: "game-body" });
  const promptText = game.text.prompt(q, script.pos);
  const caption = h("span", { class: "demo-text" });
  const mood = mascot("detective");
  const hand = h("img", { class: "demo-hand", src: emojiSrc("backhand_index_pointing_up"), width: HAND, height: HAND, alt: "" });
  const stop = h("button", { class: "btn btn-secondary demo-stop", id: "demo-stop", "data-demo-close": true }, STR.demoStop);
  const again = h("button", { class: "btn btn-secondary", id: "demo-again", hidden: true }, STR.demoAgain);
  const finish = h("button", { class: "btn btn-primary", id: "demo-ok", hidden: true }, STR.demoOk);
  const bar = h("div", { class: "demo-bar card" },
    mood,
    h("div", { class: "demo-words" }, h("div", { class: "demo-ribbon" }, STR.demoRibbon), caption),
    h("div", { class: "demo-actions" }, stop, again, finish));
  layer.append(body, bar, hand);
  ctx.stage.el.append(layer);
  ctx.voice.stop();

  // ---- the ghost hand ----
  const scale = () => layer.getBoundingClientRect().width / layer.offsetWidth || 1;
  const centerOf = (el: Element) => {
    const r = el.getBoundingClientRect(), l = layer.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, x: (r.left + r.width / 2 - l.left) / scale(), y: (r.top + r.height / 2 - l.top) / scale() };
  };
  const moveHand = (x: number, y: number) => {
    hand.style.transform = `translate(${x - HAND * TIP.x}px, ${y - HAND * TIP.y}px)`;
  };
  moveHand(layer.offsetWidth - 160, layer.offsetHeight - 40);

  const alive = () => { if (cancelled) throw new Cancelled(); };
  const pause = async (ms: number) => { await wait(ms); alive(); };

  let resultDone: (() => void) | null = null;
  const helpers: DemoHelpers = {
    async say(s) {
      alive();
      caption.textContent = s.text;
      ctx.time.touch();
      const started = performance.now();
      await ctx.voice.play(s);
      alive();
      await pause(Math.max(250, MIN_LINE_MS - (performance.now() - started)));
    },
    async tap(target) {
      alive();
      const el = typeof target === "string" ? layer.querySelector(target) : target;
      if (!el) throw new Error(`demo: nothing to tap at "${String(target)}"`);
      const { x, y, cx, cy } = centerOf(el);
      moveHand(x, y);
      await pause(MOVE_MS);
      // a soft glow on the control and a ripple under the fingertip show the tap (no flicking hand)
      el.classList.add("demo-hit");
      const ripple = h("div", { class: "demo-ripple" });
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      layer.append(ripple);
      setTimeout(() => ripple.remove(), 800);
      const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, pointerId: 77, isPrimary: true, button: 0 };
      el.dispatchEvent(new PointerEvent("pointerdown", opts));
      await pause(140);
      el.dispatchEvent(new PointerEvent("pointerup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
      await pause(380);
      el.classList.remove("demo-hit");
      ctx.time.touch();
    },
    pause,
    expectResult() {
      return new Promise<void>((resolve) => { resultDone = resolve; });
    },
  };

  // what the view calls when it is "submitted": show the result, as in a real question, but score nothing
  const submit = async (a: unknown) => {
    const result = game.logic.check(q, a);
    const fb: AnswerFeedback = { outcome: "correct", result, canContinue: true };
    await view.playResult?.(fb);
    resultDone?.();
  };

  view.mount(body, q, {
    ctx,
    pos: script.pos,
    submit: (a) => void submit(a),
    prompt: promptText,
    replayPrompt: () => {},
    wrongTries: () => 0,
    speak: () => {},
  });

  const close = () => {
    if (closed) return;
    closed = true;
    cancelled = true;
    ctx.voice.stop();
    view.unmount();
    layer.remove();
    onClose();
  };
  stop.addEventListener("click", close);
  finish.addEventListener("click", close);
  again.addEventListener("click", () => { close(); runDemo(ctx, game, onClose); });

  (async () => {
    try {
      await pause(500);
      await helpers.say(say("demo_intro"));
      await script.play(helpers, q, answer);
      mood.dataset.mood = "happy";
      mood.innerHTML = mascotSVG("happy");
      caption.textContent = say("demo_your_turn").text;
      void ctx.voice.play(say("demo_your_turn"));
      again.hidden = false;
      finish.hidden = false;
      stop.hidden = true;
      moveHand(layer.offsetWidth + 40, layer.offsetHeight + 40); // out of the way of the buttons
      layer.classList.add("finished");
    } catch (e) {
      if (!(e instanceof Cancelled)) { console.error(e); close(); }
    }
  })();

  return close;
}
