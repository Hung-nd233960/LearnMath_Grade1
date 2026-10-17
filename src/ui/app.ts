// App shell. Builds the context, keeps the page in sync with the saved settings, and starts the router.
// Settings are the single source of truth: the effect switches and the mute flag become classes on
// <html> and flags on the audio objects, and update whenever the store changes.
import { sfx } from "../audio/sfx.ts";
import { Bgm } from "../audio/bgm.ts";
import { trackForRoute } from "../audio/music.ts";
import { choosePack, loadPacks, type VoicePack } from "../audio/packs.ts";
import { Voice } from "../audio/voice.ts";
import { dayKey } from "../core/dates.ts";
import { browserKV, Store } from "../core/storage.ts";
import { channelVolume, type Fx, type Settings } from "../core/settings.ts";
import { say } from "../i18n/speech.ts";
import type { AppContext } from "./context.ts";
import { showPause, showToast } from "./notices.ts";
import { openSoundPanel } from "./soundPanel.ts";
import { COUNTING_ROUTES, Timekeeper } from "./timekeeper.ts";
import { ensureSvgDefs } from "./svgDefs.ts";
import { kitScreen } from "./screens/kit.ts";
import { breakScreen } from "./screens/break.ts";
import { devScreen } from "./screens/dev.ts";
import { homeScreen } from "./screens/home.ts";
import { lockedScreen } from "./screens/locked.ts";
import { playScreen } from "./screens/play.ts";
import { starsScreen } from "./screens/stars.ts";
import { teacherScreen } from "./screens/teacher.ts";
import { whoScreen } from "./screens/who.ts";
import { Router, type ScreenDef } from "./router.ts";
import { createStage } from "./stage.ts";

/** Screens by route name. */
const SCREENS: Record<string, ScreenDef> = {
  teacher: teacherScreen,
  who: whoScreen,
  home: homeScreen,
  play: playScreen,
  stars: starsScreen,
  break: breakScreen,
  locked: lockedScreen,
};
/** Routes that work without a chosen child (everything else sends you to "who"). */
const OPEN_ROUTES = new Set(["who", "teacher", "kit", "dev"]);
// Dev-only component gallery at #/kit (dead code in production builds).
if (import.meta.env.DEV) {
  SCREENS.kit = kitScreen;
  SCREENS.dev = devScreen; // #/dev/<game>/<tier>/<step>/<seed>: one question, deterministic
}

export function applySettings(s: Settings, voice: Voice, packs: readonly VoicePack[] = [], bgm?: Bgm): void {
  const root = document.documentElement;
  for (const key of Object.keys(s.fx) as (keyof Fx)[]) root.classList.toggle(`fx-${key}`, s.fx[key]);
  root.classList.toggle("is-muted", s.muted);
  sfx.enabled = s.fx.sfx;
  sfx.muted = s.muted;
  voice.muted = s.muted;
  // the sound mixer: each channel's volume already includes the master volume, the mute and the on/off switches
  sfx.volume = channelVolume(s, "sfx");
  voice.volume = channelVolume(s, "voice");
  bgm?.setVolume(channelVolume(s, "music"));
  voice.setPack(choosePack(s.voicePack, packs));
  if (s.muted) voice.stop();
}

export function startApp(host: HTMLElement): AppContext {
  const store = new Store(browserKV(), matchMedia("(prefers-reduced-motion: reduce)").matches);
  const voice = new Voice(`${import.meta.env.BASE_URL}audio/`);
  const bgm = new Bgm();
  voice.onSpeaking = (on) => bgm.duck(on); // the music drops while Mèo speaks
  /** The voice packs this build ships; filled in a moment after start (see below). */
  const voicePacks: VoicePack[] = [];
  const stage = createStage(host);
  ensureSvgDefs();

  // The context needs the router and the router needs the context, so create the router after.
  let router: Router;
  const time = new Timekeeper({ store, now: () => ctx.now(), today: () => ctx.today() });
  const ctx: AppContext = {
    store,
    voice,
    voicePacks,
    bgm,
    sfx,
    stage,
    time,
    go: (path) => router.go(path),
    lastSet: null,
    now: () => Date.now(),
    today: () => dayKey(new Date()),
  };

  applySettings(store.data.settings, voice, [], bgm);
  store.subscribe((d) => applySettings(d.settings, voice, voicePacks, bgm));
  void loadPacks(`${import.meta.env.BASE_URL}audio/packs.json`).then((list) => {
    voicePacks.splice(0, voicePacks.length, ...list);
    applySettings(store.data.settings, voice, voicePacks, bgm);
  });

  // Browsers block audio until the first touch: unlock it on the very first gesture (the music needs it too).
  addEventListener("pointerdown", () => voice.unlock(), { once: true, capture: true });
  addEventListener("pointerdown", () => { bgm.unlock(); bgm.hold(false); }, { capture: true }); // also ends the fade-out of an idle pause

  // The speaker button: a TAP mutes or unmutes everything; HOLDING it opens the sound mixer.
  const SPEAKER_HOLD_MS = 600;
  let holdTimer = 0, holdFrame = 0, speakerHeld = false;
  const speakers = () => document.querySelectorAll<HTMLElement>("[data-speaker]");
  addEventListener("pointerdown", (e) => {
    const button = (e.target as Element).closest<HTMLElement>("[data-speaker]");
    if (!button) return;
    speakerHeld = false;
    const began = performance.now();
    const ring = () => { button.style.setProperty("--p", String(Math.min(1, (performance.now() - began) / SPEAKER_HOLD_MS))); holdFrame = requestAnimationFrame(ring); };
    holdFrame = requestAnimationFrame(ring);
    holdTimer = window.setTimeout(() => {
      speakerHeld = true;
      cancelAnimationFrame(holdFrame);
      speakers().forEach((b) => b.style.setProperty("--p", "0"));
      openSoundPanel(ctx);
    }, SPEAKER_HOLD_MS);
  }, { capture: true });
  const endHold = () => {
    clearTimeout(holdTimer);
    cancelAnimationFrame(holdFrame);
    speakers().forEach((b) => b.style.setProperty("--p", "0"));
    // the click that follows a hold must not also toggle the mute (it may land on the panel, so forget the hold a moment later)
    if (speakerHeld) setTimeout(() => (speakerHeld = false), 350);
  };
  addEventListener("pointerup", endHold, { capture: true });
  addEventListener("pointercancel", endHold, { capture: true });
  addEventListener("contextmenu", (e) => { if ((e.target as Element).closest?.("[data-speaker]")) e.preventDefault(); });
  document.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (target.closest("[data-speaker]")) {
      if (speakerHeld) return;
      store.update((d) => ({ ...d, settings: { ...d.settings, muted: !d.settings.muted } }));
    } else if (target.closest("button, a") && !target.closest("[data-close]")) {
      sfx.play("tap");
    }
  });

  // Screen time. A due break or lock replaces home / a new set, never a set in progress (see timekeeper.ts).
  let route = "";
  router = new Router(ctx, SCREENS, {
    home: "home",
    guard: (r) => {
      if (!store.activeProfile) return OPEN_ROUTES.has(r.name) ? null : "who";
      return time.gate(r.name);
    },
    onRoute: (r) => {
      route = r.name;
      bgm.play(trackForRoute(r.name, r.params));
      time.setRoute(r.name);
    },
  });
  time.subscribe((_result, events) => {
    const counting = COUNTING_ROUTES.has(route);
    for (const e of events) {
      if (e === "idleNudge" && counting) {
        showToast(stage.el, say("idle_nudge").text, "normal");
        void voice.play(say("idle_nudge"));
      } else if (e === "idlePause" && counting) {
        bgm.hold(true);
        showPause(stage.el);
        void voice.play(say("idle_pause"));
      } else if (e === "warnDaily" && counting) {
        showToast(stage.el, say("daily_warn").text, "think", 8000);
        void voice.play(say("daily_warn"));
      } else if (e === "breakOver" && route === "break") {
        void voice.play(say("break_over"));
        ctx.go("home");
      }
    }
    // Between sets (on the home screen) a due break or lock is applied as soon as it is due.
    if (route === "home") {
      const gate = time.gate("home");
      if (gate) ctx.go(gate);
    }
  });
  time.start();
  router.start();
  // Dev console: window.__app.store.update(...) to seed profiles and settings.
  if (import.meta.env.DEV) (window as unknown as { __app: AppContext }).__app = ctx;
  return ctx;
}
