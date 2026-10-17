// The fixed 1180×820 stage, scaled to fit the window and letterboxed, plus the
// "turn your device sideways" notice for portrait screens and phones.
import { STR } from "../i18n/ui.ts";
import { h } from "./dom.ts";
import { mascot } from "./mascot.ts";

export const STAGE_W = 1180;
export const STAGE_H = 820;

export function computeScale(width: number, height: number): number {
  return Math.min(width / STAGE_W, height / STAGE_H);
}

/** Portrait, or too small to be a tablet (phones, even sideways). */
export function isPortrait(width: number, height: number): boolean {
  return height > width || Math.min(width, height) < 420;
}

export interface Stage {
  /** The 1180×820 element. Overlays, confetti and sparkles are appended here. */
  el: HTMLElement;
  /** Replace the current screen with a fresh empty one and return it. Also closes overlays. */
  newScreen(): HTMLElement;
  /** A CSS custom-property name ("--scale-bg"), a colour, or null for the default background. */
  setBackground(value: string | null): void;
  /** Remove overlays, confetti and sparkles (used when navigating). */
  closeOverlays(): void;
  fit(): void;
}

export function createStage(host: HTMLElement): Stage {
  const el = h("div", { class: "stage" });
  const rotate = h("div", { id: "rotate" }, mascot("normal"), h("p", null, STR.rotate));
  host.append(el, rotate);

  let screen: HTMLElement | null = null;

  const fit = () => {
    document.documentElement.style.setProperty("--s", String(computeScale(innerWidth, innerHeight)));
    document.body.classList.toggle("portrait", isPortrait(innerWidth, innerHeight));
  };
  addEventListener("resize", fit);
  addEventListener("orientationchange", fit);
  fit();

  const closeOverlays = () => el.querySelectorAll(".overlay, .confetti, .spark, .toast").forEach((n) => n.remove());

  return {
    el,
    newScreen() {
      closeOverlays();
      screen?.remove();
      screen = h("div", { class: "screen" });
      el.append(screen);
      return screen;
    },
    setBackground(value) {
      if (!value) el.style.removeProperty("--bg");
      else el.style.setProperty("--bg", value.startsWith("--") ? `var(${value})` : value);
    },
    closeOverlays,
    fit,
  };
}
