// Number pad bound to answer boxes (".answer-box"). The child taps a box to choose it,
// then taps digits; the keyboard works too (digits, Backspace) for desktop.
// A box keeps its digits in data-v ("" when empty); read it with boxValue().
import { $$, h, type Cleanup } from "./dom.ts";

export interface NumpadOptions {
  /** Boxes live inside this element (a screen). */
  scope: HTMLElement;
  /** Most digits per box; 2 covers every number up to 20. */
  maxDigits?: number;
  /** Called after every key, with the box that changed. */
  onChange?: (box: HTMLElement) => void;
}

export interface Numpad {
  /** Make a box the one that receives digits. */
  activate(box: HTMLElement | null): void;
  dispose: Cleanup;
}

/** Number typed in a box, or undefined while it is empty. */
export function boxValue(box: HTMLElement): number | undefined {
  const v = box.dataset.v;
  return v ? Number(v) : undefined;
}

export function setBox(box: HTMLElement, value: string): void {
  box.dataset.v = value;
  box.textContent = value;
  box.classList.toggle("filled", value !== "");
}

/** Build the pad (1–9, 0, xoá) into `container` and wire it up. */
export function createNumpad(container: HTMLElement, { scope, maxDigits = 2, onChange }: NumpadOptions): Numpad {
  container.classList.add("numpad");
  container.replaceChildren(
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => h("button", { "data-n": n }, n)),
    h("button", { class: "del", "data-del": true }, "xoá"),
  );

  let active: HTMLElement | null = scope.querySelector<HTMLElement>(".answer-box");
  const activate = (box: HTMLElement | null) => {
    $$(".answer-box", scope).forEach((b) => b.classList.remove("active"));
    active = box;
    box?.classList.add("active");
  };
  activate(active);

  const press = (key: string) => {
    if (!active) return;
    let v = active.dataset.v ?? "";
    if (key === "del") v = v.slice(0, -1);
    else if (v.length < maxDigits) v = v === "0" ? key : v + key;
    setBox(active, v);
    onChange?.(active);
  };

  const onBoxClick = (e: Event) => {
    const box = (e.target as Element).closest<HTMLElement>(".answer-box");
    if (box && scope.contains(box)) activate(box);
  };
  const onPadClick = (e: Event) => {
    const b = (e.target as Element).closest<HTMLElement>("button");
    if (!b) return;
    press(b.hasAttribute("data-del") ? "del" : b.dataset.n!);
  };
  const onKey = (e: KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
  };

  scope.addEventListener("click", onBoxClick);
  container.addEventListener("click", onPadClick);
  document.addEventListener("keydown", onKey);

  return {
    activate,
    dispose: () => {
      scope.removeEventListener("click", onBoxClick);
      container.removeEventListener("click", onPadClick);
      document.removeEventListener("keydown", onKey);
    },
  };
}
