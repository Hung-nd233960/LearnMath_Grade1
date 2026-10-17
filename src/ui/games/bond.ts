// Number bond: one number on top (the whole) joined by lines to two numbers below (the parts).
// whole = a + b. Used by "Mấy và mấy" at two sizes.
import { h } from "../dom.ts";

export type BondSlot = "whole" | "a" | "b";

export interface Bond {
  el: HTMLElement;
  /** Set the text of each circle. Slots listed in `blanks` get the green "waiting for an answer" style. */
  set(values: Record<BondSlot, string>, blanks: readonly BondSlot[]): void;
}

export function createBond(size: number): Bond {
  const width = size;
  const height = Math.round(size * 0.62);
  const diameter = Math.round(size * 0.26);
  const r = diameter / 2;
  const top = { x: width / 2, y: r + 4 };
  const left = { x: width * 0.22, y: height - r - 4 };
  const right = { x: width * 0.78, y: height - r - 4 };

  const el = h("div", { class: "bond" });
  el.style.cssText = `position:relative;width:${width}px;height:${height}px`;
  el.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="position:absolute;inset:0">
    <path d="M${top.x} ${top.y} L${left.x} ${left.y} M${top.x} ${top.y} L${right.x} ${right.y}" stroke="#1e2a4a" stroke-width="6" stroke-linecap="round"/></svg>`;

  const node = (slot: BondSlot, c: { x: number; y: number }) => {
    const n = h("div", { class: "bond-node", "data-slot": slot });
    n.style.cssText = `position:absolute;left:${c.x - r}px;top:${c.y - r}px;width:${diameter}px;height:${diameter}px;font-size:${Math.round(diameter * 0.5)}px`;
    el.append(n);
    return n;
  };
  const nodes: Record<BondSlot, HTMLElement> = { whole: node("whole", top), a: node("a", left), b: node("b", right) };

  return {
    el,
    set(values, blanks) {
      for (const slot of ["whole", "a", "b"] as const) {
        nodes[slot].textContent = values[slot];
        nodes[slot].classList.toggle("blank", blanks.includes(slot));
      }
    },
  };
}
