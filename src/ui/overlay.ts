// Overlays shown on top of a screen: feedback after an answer, and the guide card.
// They only draw; what to say and when to continue is decided by the play loop.
import { sfx } from "../audio/sfx.ts";
import { STR } from "../i18n/ui.ts";
import { confetti } from "./effects.ts";
import { emoji, h } from "./dom.ts";
import { mascot, type Mood } from "./mascot.ts";

export interface Overlay {
  el: HTMLElement;
  close(): void;
}

/** Put a card on a dimmed layer. Any element inside with data-close closes it. */
export function openOverlay(stage: HTMLElement, card: HTMLElement, onClose?: () => void): Overlay {
  const el = h("div", { class: "overlay" }, card);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.remove();
    onClose?.();
  };
  el.addEventListener("click", (e) => {
    if ((e.target as Element).closest("[data-close]")) close();
  });
  stage.append(el);
  return { el, close };
}

export interface FeedbackOptions {
  /** "correct": praise + confetti; "retry": gentle hint; "reveal": the answer is being shown. */
  kind: "correct" | "retry" | "reveal";
  title: string;
  message?: string;
  /** 1–3 stars, for the end-of-set screen. */
  stars?: number;
  /** Button text; defaults by kind. */
  button?: string;
  onClose?: () => void;
}

export function showFeedback(stage: HTMLElement, o: FeedbackOptions): Overlay {
  const ok = o.kind === "correct";
  const mood: Mood = ok ? "happy" : "think";
  if (ok) confetti(stage);
  sfx.play(ok ? "win" : "oops");
  const label = o.button ?? (o.kind === "retry" ? STR.tryAgain : STR.nextQuestion);
  const stars = o.stars ? h("div", { class: "stars" }, ...Array.from({ length: o.stars }, () => emoji("glowing_star", 54))) : null;
  const card = h("div", { class: "card" },
    mascot(mood),
    h("div", null,
      h("h2", null, o.title),
      stars,
      o.message ? h("p", null, o.message) : null,
      h("button", { class: `btn ${o.kind === "retry" ? "btn-secondary" : "btn-primary"}`, "data-close": true }, label)));
  return openOverlay(stage, card, o.onClose);
}

/** The guide (i): Mèo explains how to play in a few steps. Voice is added by the caller. */
export function showGuide(stage: HTMLElement, steps: readonly string[], onClose?: () => void): Overlay {
  const card = h("div", { class: "card" },
    mascot("detective"),
    h("div", null,
      h("h2", null, STR.guideTitle),
      h("ol", null, ...steps.map((s) => h("li", null, s))),
      h("button", { class: "btn btn-primary", "data-close": true }, STR.guideOk)));
  return openOverlay(stage, card, onClose);
}
