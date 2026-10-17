// Drag-and-drop OR tap-then-tap, one system for every game.
//   - things that move carry data-item; places they can go carry data-zone;
//   - an item with data-fixed cannot be moved (e.g. fruit already on the scale);
//   - drag an item onto a zone, or tap an item and then tap a zone / an item in another zone.
// The caller decides what a move means (onMove); this module only reports it.
import { sfx } from "../audio/sfx.ts";
import type { Cleanup } from "./dom.ts";
import { sparkle } from "./effects.ts";

export interface DragTapOptions {
  /** Element that contains the items and zones (a screen). */
  root: HTMLElement;
  /** Called after the child drops/taps an item onto a zone. Move the element yourself. */
  onMove(item: HTMLElement, zone: HTMLElement): void;
}

const DRAG_THRESHOLD_PX = 8;

export function dragTap({ root, onMove }: DragTapOptions): Cleanup {
  const stage = root.closest<HTMLElement>(".stage");
  let selected: HTMLElement | null = null;
  let pressed: HTMLElement | null = null;
  let start = { x: 0, y: 0 };
  let ghost: HTMLElement | null = null;
  let grab = { x: 0, y: 0 };

  const zoneOf = (el: Element | null) => el?.closest<HTMLElement>("[data-zone]") ?? null;
  const clearSelected = () => {
    selected?.classList.remove("selected");
    selected = null;
  };
  const moved = (item: HTMLElement, zone: HTMLElement) => {
    onMove(item, zone);
    sfx.play("drop");
    if (stage) requestAnimationFrame(() => sparkle(stage, item, 5, 46));
  };
  const endDrag = () => {
    ghost?.remove();
    ghost = null;
    pressed?.classList.remove("dragging");
    pressed = null;
  };

  const onDown = (e: PointerEvent) => {
    const target = e.target as Element;
    const item = target.closest<HTMLElement>("[data-item]");
    if (item && !item.hasAttribute("data-fixed")) {
      pressed = item;
      start = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }
    const zone = zoneOf(target);
    if (zone && selected) {
      const s = selected;
      clearSelected();
      moved(s, zone);
    }
  };

  const onMoveEvt = (e: PointerEvent) => {
    if (!pressed) return;
    if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD_PX) {
      clearSelected();
      const r = pressed.getBoundingClientRect();
      const scale = r.width / pressed.offsetWidth || 1; // the stage is scaled
      ghost = pressed.cloneNode(true) as HTMLElement;
      ghost.classList.add("ghost");
      ghost.classList.remove("selected", "dragging");
      ghost.style.width = pressed.offsetWidth + "px";
      ghost.style.height = pressed.offsetHeight + "px";
      ghost.style.transform = `scale(${scale * 1.12})`;
      grab = { x: start.x - r.left, y: start.y - r.top };
      document.body.append(ghost);
      pressed.classList.add("dragging");
      sfx.play("pick");
    }
    if (ghost) {
      ghost.style.left = e.clientX - grab.x + "px";
      ghost.style.top = e.clientY - grab.y + "px";
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!pressed) return;
    const item = pressed;
    if (ghost) {
      const zone = zoneOf(document.elementFromPoint(e.clientX, e.clientY));
      endDrag();
      if (zone) moved(item, zone);
      return;
    }
    pressed = null; // it was a tap, not a drag
    const itemZone = zoneOf(item);
    if (selected && selected !== item && itemZone && zoneOf(selected) !== itemZone) {
      const s = selected;
      clearSelected();
      moved(s, itemZone);
      return;
    }
    if (selected === item) return clearSelected();
    clearSelected();
    selected = item;
    item.classList.add("selected");
    sfx.play("pick");
  };

  root.addEventListener("pointerdown", onDown);
  document.addEventListener("pointermove", onMoveEvt);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", endDrag);

  return () => {
    root.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointermove", onMoveEvt);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", endDrag);
    endDrag();
    clearSelected();
  };
}
