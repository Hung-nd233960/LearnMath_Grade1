// Device-wide settings. Changed ONLY in the PIN-protected teacher area.
import { DEFAULT_PIN } from "./config.ts";
import { makePin, type PinRecord } from "./pin.ts";
import { defaultLimits, type Limits } from "./screentime.ts";

/** Eye-candy switches. Each maps to a class on <html>: fx-anim, fx-decor, fx-celebrate, fx-sfx, fx-music. */
export interface Fx {
  anim: boolean;
  decor: boolean;
  celebrate: boolean;
  sfx: boolean;
  /** Background music (a light tune in the lobby and one for each game). */
  music: boolean;
}

export type FxPreset = "calm" | "mid" | "all";

export const FX_PRESETS: Record<FxPreset, Fx> = {
  calm: { anim: false, decor: false, celebrate: false, sfx: false, music: false },
  mid: { anim: true, decor: false, celebrate: true, sfx: true, music: true },
  all: { anim: true, decor: true, celebrate: true, sfx: true, music: true },
};

/**
 * The sound mixer a child can reach by holding the speaker button. Volumes are 0..1; each channel also has
 * an on/off switch so a volume is remembered while it is off. "master" has no switch of its own: the
 * speaker's tap is `Settings.muted`.
 */
export interface Mix {
  master: number;
  music: number;
  sfx: number;
  voice: number;
  musicOn: boolean;
  sfxOn: boolean;
  voiceOn: boolean;
}

export type Channel = "music" | "sfx" | "voice";

export const DEFAULT_MIX: Mix = { master: 1, music: 0.6, sfx: 0.8, voice: 1, musicOn: true, sfxOn: true, voiceOn: true };

const clamp01 = (n: unknown, fallback: number): number => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);

/** Make anything read from storage or a backup into a valid Mix. */
export function sanitizeMix(m: Partial<Mix> | undefined): Mix {
  return {
    master: clamp01(m?.master, DEFAULT_MIX.master),
    music: clamp01(m?.music, DEFAULT_MIX.music),
    sfx: clamp01(m?.sfx, DEFAULT_MIX.sfx),
    voice: clamp01(m?.voice, DEFAULT_MIX.voice),
    musicOn: typeof m?.musicOn === "boolean" ? m.musicOn : DEFAULT_MIX.musicOn,
    sfxOn: typeof m?.sfxOn === "boolean" ? m.sfxOn : DEFAULT_MIX.sfxOn,
    voiceOn: typeof m?.voiceOn === "boolean" ? m.voiceOn : DEFAULT_MIX.voiceOn,
  };
}

/**
 * How loud a channel plays right now, 0..1: silent when the speaker is muted, when the teacher switched the
 * effect off (music and sfx), or when the child switched the channel off; otherwise master × channel volume.
 */
export function channelVolume(s: Pick<Settings, "fx" | "mix" | "muted">, channel: Channel): number {
  if (s.muted) return 0;
  if (channel === "music" && !s.fx.music) return 0;
  if (channel === "sfx" && !s.fx.sfx) return 0;
  const on = channel === "music" ? s.mix.musicOn : channel === "sfx" ? s.mix.sfxOn : s.mix.voiceOn;
  return on ? s.mix.master * s.mix[channel] : 0;
}

/** How the day's games are put in order: lowest level first ("Khởi động"), or shuffled. */
export type DailyOrder = "warmup" | "random";

/** The daily plan (see dailyPlan.ts): how many games a child plays per day (0 = no plan, every game is open) and in what order. */
export interface DailySettings {
  gamesPerDay: number;
  order: DailyOrder;
}

export const DEFAULT_DAILY: DailySettings = { gamesPerDay: 3, order: "warmup" };
export const MAX_DAILY_GAMES = 6;

/** Make anything read from storage or a backup into valid daily settings. */
export function sanitizeDaily(d: Partial<DailySettings> | undefined): DailySettings {
  const n = d?.gamesPerDay;
  return {
    gamesPerDay: typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_DAILY_GAMES ? n : DEFAULT_DAILY.gamesPerDay,
    order: d?.order === "random" || d?.order === "warmup" ? d.order : DEFAULT_DAILY.order,
  };
}

export interface Settings {
  fx: Fx;
  limits: Limits;
  /** Saturdays and Sundays without play do not break the streak. */
  skipWeekends: boolean;
  /** Master sound switch (voice + effects). Children may toggle this one with the speaker button. */
  muted: boolean;
  /** Volumes of the sound mixer (hold the speaker button). */
  mix: Mix;
  /** Voice pack chosen in the teacher area (a folder in public/audio, or "device"); null = the best available. */
  voicePack: string | null;
  /** Games per day and their order. Added after the first release: older saves get the defaults. */
  daily: DailySettings;
  pin: PinRecord;
}

/** `reducedMotion`: pass matchMedia("(prefers-reduced-motion: reduce)").matches on first run. */
export function defaultSettings(reducedMotion = false): Settings {
  return {
    fx: { ...FX_PRESETS.all, anim: !reducedMotion },
    limits: defaultLimits(),
    skipWeekends: true,
    muted: false,
    mix: { ...DEFAULT_MIX },
    voicePack: null,
    daily: { ...DEFAULT_DAILY },
    pin: makePin(DEFAULT_PIN, "default"),
  };
}

/** Which preset (if any) the switches currently match — to highlight it in the teacher area. */
export function matchingPreset(fx: Fx): FxPreset | null {
  for (const [name, p] of Object.entries(FX_PRESETS) as [FxPreset, Fx][]) {
    if (p.anim === fx.anim && p.decor === fx.decor && p.celebrate === fx.celebrate && p.sfx === fx.sfx && p.music === fx.music) return name;
  }
  return null;
}
