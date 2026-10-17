// The effect switches live on <html> as classes (fx-anim, fx-decor, fx-celebrate, fx-sfx),
// set by app.ts from settings.fx. UI code asks here instead of reading settings itself.
import type { Fx } from "../core/settings.ts";

export function fxOn(key: keyof Fx): boolean {
  return document.documentElement.classList.contains(`fx-${key}`);
}
