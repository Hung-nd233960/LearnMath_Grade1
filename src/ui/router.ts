// Hash router: "#/play/split" → screen "play" with params ["split"].
// A screen is a function that draws into the stage's current screen element and returns a
// cleanup function (remove listeners, stop timers). The router calls it before every navigation.
import { mountDecor } from "./decor.ts";
import type { AppContext } from "./context.ts";
import type { Cleanup } from "./dom.ts";

export interface ParsedRoute {
  name: string;
  params: string[];
}

export function parseRoute(hash: string): ParsedRoute {
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  const [name = "", ...params] = path.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  return { name, params };
}

export interface ScreenArgs {
  ctx: AppContext;
  /** The empty element to draw into. */
  screen: HTMLElement;
  params: string[];
}

export interface ScreenDef {
  mount(args: ScreenArgs): Cleanup | void;
  /** Page background: a CSS variable name ("--scale-bg") or a colour. Default: the home colour. */
  bg?: string;
  /** Decoration picture set (see decor.ts): defaults to the screen name; null = none. */
  decor?: string | null;
}

export interface RouterOptions {
  /** Screen shown for "" and for unknown names. */
  home: string;
  /** Return another route name to redirect (e.g. "who" when no profile is chosen), or null to allow. */
  guard?: (route: ParsedRoute) => string | null;
  /** Called with the route that is about to be shown (after any redirect). */
  onRoute?: (route: ParsedRoute) => void;
}

export class Router {
  private cleanup: Cleanup | void = undefined;

  constructor(
    private readonly ctx: AppContext,
    private readonly screens: Record<string, ScreenDef>,
    private readonly options: RouterOptions,
  ) {}

  start(): void {
    addEventListener("hashchange", () => this.render());
    this.render();
  }

  go(path: string): void {
    const hash = "#/" + path.replace(/^\/+/, "");
    if (location.hash === hash) this.render();
    else location.hash = hash;
  }

  private render(): void {
    let route = parseRoute(location.hash);
    if (!(route.name in this.screens)) route = { name: this.options.home, params: [] };
    const redirect = this.options.guard?.(route);
    if (redirect && redirect !== route.name && redirect in this.screens) route = { name: redirect, params: [] };

    this.options.onRoute?.(route);
    this.cleanup?.();
    this.cleanup = undefined;
    const def = this.screens[route.name]!;
    const { stage } = this.ctx;
    const screen = stage.newScreen();
    stage.setBackground(def.bg ?? null);
    mountDecor(screen, def.decor === undefined ? route.name : def.decor);
    try {
      this.cleanup = def.mount({ ctx: this.ctx, screen, params: route.params });
    } catch (err) {
      console.error(`Screen "${route.name}" failed to mount`, err);
    }
  }
}
