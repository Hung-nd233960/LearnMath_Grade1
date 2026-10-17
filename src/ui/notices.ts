// Small notices for screen time: a toast (Mèo says something short) and the "paused" overlay.
import { sfx } from "../audio/sfx.ts";
import { STR } from "../i18n/ui.ts";
import { h } from "./dom.ts";
import { mascot, type Mood } from "./mascot.ts";
import { openOverlay, type Overlay } from "./overlay.ts";

/** A bubble at the bottom of the screen that goes away by itself (or when the child touches the screen). */
export function showToast(stage: HTMLElement, text: string, mood: Mood = "normal", ms = 6000): () => void {
  stage.querySelectorAll(".toast").forEach((t) => t.remove());
  const el = h("div", { class: "toast card", role: "status" }, mascot(mood), h("span", null, text));
  stage.append(el);
  const remove = () => {
    clearTimeout(timer);
    removeEventListener("pointerdown", remove, true);
    el.remove();
  };
  const timer = window.setTimeout(remove, ms);
  // the first touch after the toast appeared dismisses it (not a touch that is already happening)
  setTimeout(() => addEventListener("pointerdown", remove, { capture: true, once: true }), 50);
  return remove;
}

/** Shown when the child has not touched the screen for a while. Any touch closes it. */
export function showPause(stage: HTMLElement): Overlay {
  stage.querySelectorAll(".toast").forEach((t) => t.remove()); // the earlier nudge has done its job
  const card = h("div", { class: "card pause-card" }, mascot("sleep"), h("div", null, h("h2", null, STR.pauseTitle), h("p", null, STR.pauseHint)));
  const overlay = openOverlay(stage, card);
  overlay.el.dataset.kind = "pause";
  overlay.el.addEventListener("pointerdown", () => overlay.close());
  sfx.play("tap");
  return overlay;
}
