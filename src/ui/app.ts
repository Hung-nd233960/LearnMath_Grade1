// App shell. Builds the context, keeps the page in sync with the saved settings, and starts the router.
// Settings are the single source of truth: the effect switches and the mute flag become classes on
// <html> and flags on the audio objects, and update whenever the store changes.
import { sfx } from "../audio/sfx.ts";
import { Voice } from "../audio/voice.ts";
import { dayKey } from "../core/dates.ts";
import { browserKV, Store } from "../core/storage.ts";
import type { Fx, Settings } from "../core/settings.ts";
import type { AppContext } from "./context.ts";
import { ensureSvgDefs } from "./svgDefs.ts";
import { kitScreen } from "./screens/kit.ts";
import { homeScreen } from "./screens/home.ts";
import { whoScreen } from "./screens/who.ts";
import { Router, type ScreenDef } from "./router.ts";
import { createStage } from "./stage.ts";

/** Screens by route name. Steps 2–10 of docs/BUILD_PLAN.md add: who, home, play, stars, break, locked, teacher. */
const SCREENS: Record<string, ScreenDef> = {
  who: whoScreen,
  home: homeScreen,
};
/** Routes that work without a chosen child (everything else sends you to "who"). */
const OPEN_ROUTES = new Set(["who", "teacher", "kit"]);
// Dev-only component gallery at #/kit (dead code in production builds).
if (import.meta.env.DEV) SCREENS.kit = kitScreen;

export function applySettings(s: Settings, voice: Voice): void {
  const root = document.documentElement;
  for (const key of Object.keys(s.fx) as (keyof Fx)[]) root.classList.toggle(`fx-${key}`, s.fx[key]);
  root.classList.toggle("is-muted", s.muted);
  sfx.enabled = s.fx.sfx;
  sfx.muted = s.muted;
  voice.muted = s.muted;
  if (s.muted) voice.stop();
}

export function startApp(host: HTMLElement): AppContext {
  const store = new Store(browserKV(), matchMedia("(prefers-reduced-motion: reduce)").matches);
  const voice = new Voice(`${import.meta.env.BASE_URL}audio/`);
  const stage = createStage(host);
  ensureSvgDefs();

  // The context needs the router and the router needs the context, so create the router after.
  let router: Router;
  const ctx: AppContext = {
    store,
    voice,
    sfx,
    stage,
    go: (path) => router.go(path),
    now: () => Date.now(),
    today: () => dayKey(new Date()),
  };

  applySettings(store.data.settings, voice);
  store.subscribe((d) => applySettings(d.settings, voice));

  // Browsers block audio until the first touch: unlock it on the very first gesture.
  addEventListener("pointerdown", () => voice.unlock(), { once: true, capture: true });

  // The speaker is the one setting children may change.
  document.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (target.closest("[data-speaker]")) {
      store.update((d) => ({ ...d, settings: { ...d.settings, muted: !d.settings.muted } }));
    } else if (target.closest("button, a") && !target.closest("[data-close]")) {
      sfx.play("tap");
    }
  });

  router = new Router(ctx, SCREENS, { home: "home", guard: (r) => (!store.activeProfile && !OPEN_ROUTES.has(r.name) ? "who" : null) });
  router.start();
  // Dev console: window.__app.store.update(...) to seed profiles and settings.
  if (import.meta.env.DEV) (window as unknown as { __app: AppContext }).__app = ctx;
  return ctx;
}
