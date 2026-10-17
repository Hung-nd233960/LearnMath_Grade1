// A 4-digit PIN entry: four dots, a number pad, keyboard digits. Used by the teacher gate and "change PIN".
import { PIN_LENGTH } from "../core/pin.ts";
import { $$, h, type Cleanup } from "./dom.ts";

export interface PinPad {
  el: HTMLElement;
  /** Empty the dots. */
  reset(): void;
  /** Shake the dots (a wrong code), then empty them. */
  fail(): void;
  /** While disabled the pad ignores digits. */
  setDisabled(disabled: boolean): void;
  dispose: Cleanup;
}

export function createPinPad(onComplete: (pin: string) => void): PinPad {
  let entry = "";
  let disabled = false;
  const dots = h("div", { class: "pin-dots" }, ...Array.from({ length: PIN_LENGTH }, () => h("span")));
  const keys = h("div", { class: "numpad pin-keys" },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h("button", { "data-k": n }, n)),
    h("span"),
    h("button", { "data-k": 0 }, 0),
    h("button", { class: "del", "data-k": "del" }, "xoá"));
  const el = h("div", { class: "pin-pad" }, dots, keys);

  const paint = () => $$("span", dots).forEach((s, i) => s.classList.toggle("f", i < entry.length));
  const press = (k: string) => {
    if (disabled) return;
    entry = k === "del" ? entry.slice(0, -1) : (entry + k).slice(0, PIN_LENGTH);
    paint();
    if (entry.length === PIN_LENGTH) {
      const pin = entry;
      // let the last dot show before the answer is judged
      setTimeout(() => onComplete(pin), 120);
    }
  };
  const onClick = (e: Event) => {
    const b = (e.target as Element).closest<HTMLElement>("button");
    if (b) press(b.dataset.k!);
  };
  const onKey = (e: KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
  };
  keys.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);

  const reset = () => {
    entry = "";
    paint();
  };
  return {
    el,
    reset,
    fail() {
      dots.classList.add("shake");
      setTimeout(() => { dots.classList.remove("shake"); reset(); }, 450);
    },
    setDisabled(d) {
      disabled = d;
      el.classList.toggle("disabled", d);
    },
    dispose: () => document.removeEventListener("keydown", onKey),
  };
}
