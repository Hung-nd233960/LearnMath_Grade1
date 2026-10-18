// The fixed 1180×820 stage, scaled to fit the window and letterboxed, plus the
// "turn your device sideways" notice for portrait screens. Phones in landscape are let in (round 2): the stage then
// fits the space left by the notch and the home indicator (the safe area).
import { STR } from "../i18n/ui.ts";
import { h } from "./dom.ts";
import { mascot } from "./mascot.ts";

export const STAGE_W = 1180;
export const STAGE_H = 820;
/** The stage on a short, wide screen (a phone sideways): 1240×600. Every screen has its own layout for it (styles/wide.css). */
export const WIDE_W = 1240;
export const WIDE_H = 600;

export interface Layout {
  /** The wide stage is in use (body.wide). */
  wide: boolean;
  stageW: number;
  stageH: number;
  /** How much the stage is scaled to fit the window. */
  scale: number;
}

/**
 * Which stage to draw in a window of this size (after the notch and the home indicator are taken off).
 * Short and wide (aspect 1.75 or more, under 600 px high: an iPhone sideways) gets the wide stage, so the
 * stage fills the screen instead of leaving bars at the sides; everything else keeps the 1180×820 stage.
 */
export function computeLayout(width: number, height: number): Layout {
  const wide = height > 0 && width / height >= 1.75 && height < 600;
  const stageW = wide ? WIDE_W : STAGE_W;
  const stageH = wide ? WIDE_H : STAGE_H;
  return { wide, stageW, stageH, scale: Math.min(width / stageW, height / stageH) };
}

export function computeScale(width: number, height: number): number {
  return computeLayout(width, height).scale;
}

/** Portrait: ask for the device to be turned sideways. (Phones used to be refused as too small; they are let in now.) */
export function isPortrait(width: number, height: number): boolean {
  return height > width;
}

export interface Insets { top: number; right: number; bottom: number; left: number }

/** The space the notch, the Dynamic Island and the home indicator take (env(safe-area-inset-*)); zero on most screens. */
export function safeInsets(): Insets {
  const probe = h("div", { style: "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)" });
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const out = { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
  probe.remove();
  return out;
}

export interface Stage {
  /** The stage element (1180×820, or 1240×600 on a phone sideways). Overlays, confetti and sparkles are appended here. */
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
    const inset = safeInsets();
    const root = document.documentElement.style;
    const layout = computeLayout(innerWidth - inset.left - inset.right, innerHeight - inset.top - inset.bottom);
    root.setProperty("--s", String(layout.scale));
    root.setProperty("--stage-w", `${layout.stageW}px`);
    root.setProperty("--stage-h", `${layout.stageH}px`);
    document.body.classList.toggle("wide", layout.wide);
    // the stage is centred in what is left of the window, not in the whole window
    root.setProperty("--ox", `${(inset.left - inset.right) / 2}px`);
    root.setProperty("--oy", `${(inset.top - inset.bottom) / 2}px`);
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
