// Device-wide settings. Changed ONLY in the PIN-protected teacher area.
import { DEFAULT_PIN } from "./config.ts";
import { makePin, type PinRecord } from "./pin.ts";
import { defaultLimits, type Limits } from "./screentime.ts";

/** Eye-candy switches. Each maps to a class on <html>: fx-anim, fx-decor, fx-celebrate, fx-sfx. */
export interface Fx {
  anim: boolean;
  decor: boolean;
  celebrate: boolean;
  sfx: boolean;
}

export type FxPreset = "calm" | "mid" | "all";

export const FX_PRESETS: Record<FxPreset, Fx> = {
  calm: { anim: false, decor: false, celebrate: false, sfx: false },
  mid: { anim: true, decor: false, celebrate: true, sfx: true },
  all: { anim: true, decor: true, celebrate: true, sfx: true },
};

export interface Settings {
  fx: Fx;
  limits: Limits;
  /** Saturdays and Sundays without play do not break the streak. */
  skipWeekends: boolean;
  /** Master sound switch (voice + effects). Children may toggle this one with the speaker button. */
  muted: boolean;
  /** Voice pack chosen in the teacher area (a folder in public/audio, or "device"); null = the best available. */
  voicePack: string | null;
  pin: PinRecord;
}

/** `reducedMotion`: pass matchMedia("(prefers-reduced-motion: reduce)").matches on first run. */
export function defaultSettings(reducedMotion = false): Settings {
  return {
    fx: { ...FX_PRESETS.all, anim: !reducedMotion },
    limits: defaultLimits(),
    skipWeekends: true,
    muted: false,
    voicePack: null,
    pin: makePin(DEFAULT_PIN, "default"),
  };
}

/** Which preset (if any) the switches currently match — to highlight it in the teacher area. */
export function matchingPreset(fx: Fx): FxPreset | null {
  for (const [name, p] of Object.entries(FX_PRESETS) as [FxPreset, Fx][]) {
    if (p.anim === fx.anim && p.decor === fx.decor && p.celebrate === fx.celebrate && p.sfx === fx.sfx) return name;
  }
  return null;
}
