// The clock behind screen time. It owns the in-memory usage of the active child, feeds the pure
// model in core/screentime.ts once a second, saves the usage into the profile now and then,
// and tells the app about events (idle nudge, pause, daily warning, break over).
//
// Rules that matter (docs/RULES.md):
//  - only real use is counted: home, play and the star screen; not a break, the teacher area or the picker;
//  - a due break or lock is applied only BETWEEN sets: when the child goes home or starts a new set;
//    a set in progress and the star screen are never interrupted.
import { dailyLeftNow, grantBonus, noteInput, startBreak, endBreak, tick, type Limits, type TickResult, type TimeEvent, type Usage } from "../core/screentime.ts";
import type { DayKey } from "../core/dates.ts";
import type { Store } from "../core/storage.ts";

/** Screens where time is counted. */
export const COUNTING_ROUTES = new Set(["home", "play", "stars"]);
/** Screens that a due break or lock replaces. Never "play" mid-set: only entering it is a navigation. */
export const GATED_ROUTES = new Set(["home", "play"]);

/** Which timeout screen (if any) should replace `route` right now. Pure. */
export function gateFor(route: string, s: Pick<TickResult, "mode" | "breakDue" | "lockDue"> | null): "break" | "locked" | null {
  if (!s || !GATED_ROUTES.has(route)) return null;
  if (s.lockDue) return "locked";
  if (s.mode === "break" || s.breakDue) return "break";
  return null;
}

/** 297000 ms → "4:57" (rounded up, so the clock never shows 0:00 while time is left). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export interface TimeDeps {
  store: Store;
  now(): number;
  today(): DayKey;
}

export type TimeListener = (result: TickResult, events: TimeEvent[]) => void;

const SAVE_EVERY_MS = 10_000;

export class Timekeeper {
  private usage: Usage | null = null;
  private id: string | null = null;
  private last: TickResult | null = null;
  private route = "";
  private timer = 0;
  private lastSave = 0;
  private readonly listeners = new Set<TimeListener>();

  constructor(private readonly deps: TimeDeps) {}

  private get limits(): Limits {
    return this.deps.store.data.settings.limits;
  }

  start(): void {
    this.reload();
    this.deps.store.subscribe((d) => {
      if (d.activeId !== this.id) this.switchTo(d.activeId);
    });
    const note = () => {
      if (this.usage) this.usage = noteInput(this.usage, this.deps.now());
    };
    addEventListener("pointerdown", note, { capture: true });
    addEventListener("keydown", note, { capture: true });
    addEventListener("pagehide", () => this.flush());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.flush(); });
    this.timer = window.setInterval(() => this.step(), 1000);
  }

  stop(): void {
    clearInterval(this.timer);
  }

  /** Tell the clock which screen is showing: it decides whether time counts. */
  setRoute(name: string): void {
    this.route = name;
  }

  subscribe(fn: TimeListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot(): TickResult | null {
    return this.last;
  }

  dailyLeftMs(): number {
    return this.usage ? dailyLeftNow(this.usage, this.limits, this.deps.today()) : this.limits.dailyMin * 60000;
  }

  playedMs(): number {
    return this.usage?.playedMs ?? 0;
  }

  gate(route: string): "break" | "locked" | null {
    return gateFor(route, this.last);
  }

  /** (Re)load the active child's saved usage, e.g. after another child is chosen. */
  reload(): void {
    const p = this.deps.store.activeProfile;
    this.id = p?.id ?? null;
    this.usage = p ? noteInput({ ...p.usage, lastTickAt: null }, this.deps.now()) : null;
    this.last = null;
    if (this.usage) this.step();
  }

  /** Start the break if one is due (or already running). Returns false when there is no break to show. */
  ensureBreak(): boolean {
    if (!this.usage) return false;
    if (this.usage.breakUntil !== null) return true;
    if (!this.last?.breakDue) return false;
    this.usage = startBreak(this.usage, this.deps.now(), this.limits);
    this.flush();
    this.step();
    return true;
  }

  /** An adult grants more play time today (PIN-protected in the teacher area). */
  grantBonus(minutes: number): void {
    if (!this.usage) return;
    this.usage = grantBonus(this.usage, minutes);
    this.flush();
    this.step();
  }

  /** An adult ends a break early. */
  endBreak(): void {
    if (!this.usage) return;
    this.usage = endBreak(this.usage);
    this.flush();
    this.step();
  }

  /** Forget the working usage WITHOUT saving it: a backup is about to replace all data. Follow with reload(). */
  discard(): void {
    this.usage = null;
    this.id = null;
    this.last = null;
  }

  /** Write the working usage into the child's profile. */
  flush(): void {
    this.save(this.id, this.usage);
  }

  private save(id: string | null, usage: Usage | null): void {
    if (!id || !usage || !this.deps.store.data.profiles[id]) return;
    this.lastSave = this.deps.now();
    this.deps.store.update((d) => ({ ...d, profiles: { ...d.profiles, [id]: { ...d.profiles[id]!, usage } } }));
  }

  private switchTo(newId: string | null): void {
    const oldId = this.id;
    const oldUsage = this.usage;
    // Take over the new child FIRST: saving notifies the store's subscribers, which must already see the new id.
    this.id = newId;
    const p = newId ? this.deps.store.data.profiles[newId] : undefined;
    this.usage = p ? noteInput({ ...p.usage, lastTickAt: null }, this.deps.now()) : null;
    this.last = null;
    this.save(oldId, oldUsage); // keep the previous child's time
    if (this.usage) this.step();
  }

  private step(): void {
    if (!this.usage) return;
    const now = this.deps.now();
    let u = this.usage;
    // Not a counting screen: time stands still (and the child is not "idle").
    if (!COUNTING_ROUTES.has(this.route)) u = { ...u, lastTickAt: now, lastInputAt: now };
    const result = tick(u, now, this.limits, this.deps.today());
    this.usage = result.usage;
    this.last = result;
    this.listeners.forEach((fn) => fn(result, result.events));
    if (now - this.lastSave >= SAVE_EVERY_MS) this.flush();
  }
}
