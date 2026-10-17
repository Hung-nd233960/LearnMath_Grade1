// The adult gate: a small padlock in a screen corner. Holding it about a second opens
// the teacher area (a PIN is still asked there). A quick tap only shows a hint, so a child
// tapping around never lands on the PIN screen by accident.
import { STR } from "../i18n/ui.ts";
import type { Cleanup } from "./dom.ts";
import { emoji, h } from "./dom.ts";

export const GATE_HOLD_MS = 1100;

export function mountAdultGate(parent: HTMLElement, onOpen: () => void): Cleanup {
  const button = h("button", { class: "gate-btn", title: STR.gateTitle }, emoji("locked", 28));
  const tip = h("div", { class: "gate-tip" }, STR.gateHint);
  parent.append(button, tip);

  let startedAt: number | null = null;
  let frame = 0;
  let timer = 0;
  let tipTimer = 0;
  let opened = false;

  // The timer decides when the gate opens; animation frames only draw the progress ring
  // (browsers may throttle frames, which must never block a real long-press).
  const drawRing = () => {
    if (startedAt === null || opened) return;
    button.style.setProperty("--p", String(Math.min(1, (performance.now() - startedAt) / GATE_HOLD_MS)));
    frame = requestAnimationFrame(drawRing);
  };

  const onDown = (e: PointerEvent) => {
    e.preventDefault();
    startedAt = performance.now();
    opened = false;
    frame = requestAnimationFrame(drawRing);
    timer = window.setTimeout(() => {
      opened = true;
      button.style.setProperty("--p", "1");
      onOpen();
    }, GATE_HOLD_MS);
  };

  const onStop = () => {
    if (startedAt === null) return;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    startedAt = null;
    if (opened) return;
    button.style.setProperty("--p", "0");
    tip.classList.add("show");
    clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => tip.classList.remove("show"), 1800);
  };

  button.addEventListener("pointerdown", onDown);
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(ev, onStop);

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    clearTimeout(tipTimer);
    button.remove();
    tip.remove();
  };
}
