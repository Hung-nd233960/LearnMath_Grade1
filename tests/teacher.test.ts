import { describe, expect, it } from "vitest";
import { DEFAULT_PIN, TEACHER_UNLOCK_MINUTES } from "../src/core/config.ts";
import { makePin } from "../src/core/pin.ts";
import { defaultLimits } from "../src/core/screentime.ts";
import { Store, exportJSON, importJSON, memoryKV } from "../src/core/storage.ts";
import {
  afterPinAttempt, isDefaultPin, LIMIT_RANGES, NO_ATTEMPTS, PIN_TRIES, PIN_WAIT_MS, pinBlocked, setLimit, unlockValid,
} from "../src/core/teacher.ts";

describe("teacher limits", () => {
  it("snaps to the slider step and stays inside the range", () => {
    expect(setLimit(defaultLimits(), "sessionMin", 17).sessionMin).toBe(15);
    expect(setLimit(defaultLimits(), "sessionMin", 99).sessionMin).toBe(LIMIT_RANGES.sessionMin.max);
    expect(setLimit(defaultLimits(), "dailyMin", 1).dailyMin).toBe(LIMIT_RANGES.dailyMin.min);
  });

  it("the pause always comes later than the nudge", () => {
    for (const sec of [10, 20, 35, 60, 120]) {
      const l = setLimit(defaultLimits(), "idleNudgeSec", sec);
      expect(l.idlePauseSec).toBeGreaterThan(l.idleNudgeSec);
    }
    expect(setLimit(defaultLimits(), "idleNudgeSec", 60).idlePauseSec).toBe(180); // the defaults agree (nudge after 1 minute, pause after 3)
  });

  it("the warning never comes before the day starts", () => {
    const l = setLimit({ ...defaultLimits(), warnBeforeMin: 5 }, "dailyMin", 10);
    expect(l.warnBeforeMin).toBeLessThan(l.dailyMin);
  });

  it("does not change the other limits", () => {
    const before = defaultLimits();
    const after = setLimit(before, "breakMin", 8);
    expect(after).toEqual({ ...before, breakMin: 8 });
  });
});

describe("teacher unlock", () => {
  it("is open for the set time, then closed", () => {
    const t = 1_000_000;
    expect(unlockValid(null, t)).toBe(false);
    expect(unlockValid(t, t + 60_000)).toBe(true);
    expect(unlockValid(t, t + TEACHER_UNLOCK_MINUTES * 60_000 - 1)).toBe(true);
    expect(unlockValid(t, t + TEACHER_UNLOCK_MINUTES * 60_000)).toBe(false);
  });
  it("a clock that went backwards is not an unlock", () => {
    expect(unlockValid(5_000, 1_000)).toBe(false);
  });
});

describe("PIN attempts", () => {
  it("waits after too many wrong codes, and a right code clears the count", () => {
    let a = NO_ATTEMPTS;
    for (let i = 0; i < PIN_TRIES - 1; i++) {
      a = afterPinAttempt(a, false, 0);
      expect(pinBlocked(a, 0)).toBe(false);
    }
    a = afterPinAttempt(a, false, 0);
    expect(pinBlocked(a, 1)).toBe(true);
    expect(pinBlocked(a, PIN_WAIT_MS)).toBe(false);
    expect(afterPinAttempt(a, true, PIN_WAIT_MS)).toEqual(NO_ATTEMPTS);
  });
  it("knows the default PIN", () => {
    expect(isDefaultPin(makePin(DEFAULT_PIN))).toBe(true);
    expect(isDefaultPin(makePin("4321"))).toBe(false);
  });
});

describe("store: teacher operations", () => {
  it("renames a child and keeps their progress", () => {
    const s = new Store(memoryKV());
    const p = s.addProfile("An", "rocket", 1);
    s.update((d) => ({ ...d, profiles: { ...d.profiles, [p.id]: { ...d.profiles[p.id]!, stars: 12 } } }));
    s.patchProfile(p.id, (x) => ({ ...x, name: "Bình", avatar: "kite", id: "hacked" }));
    expect(s.data.profiles[p.id]).toMatchObject({ name: "Bình", avatar: "kite", stars: 12, id: p.id });
    expect(Object.keys(s.data.profiles)).toEqual([p.id]);
  });

  it("an exported backup, imported into a fresh store, restores everything", () => {
    const a = new Store(memoryKV());
    const p = a.addProfile("Chi", "strawberry", 1);
    a.update((d) => ({
      ...d,
      profiles: { ...d.profiles, [p.id]: { ...d.profiles[p.id]!, stars: 7 } },
      settings: { ...d.settings, skipWeekends: false, fx: { anim: false, decor: false, celebrate: true, sfx: false, music: false }, limits: { ...d.settings.limits, dailyMin: 45 }, pin: makePin("9876") },
    }));
    const b = new Store(memoryKV());
    b.replace({ ...importJSON(exportJSON(a.data)), activeId: null });
    expect(b.data.profiles[p.id]).toMatchObject({ name: "Chi", stars: 7 });
    expect(b.data.order).toEqual([p.id]);
    expect(b.data.settings).toEqual(a.data.settings);
  });

  it("replace notifies subscribers and saves", () => {
    const kv = memoryKV();
    const s = new Store(kv);
    let calls = 0;
    s.subscribe(() => calls++);
    const other = new Store(memoryKV());
    other.addProfile("Hà", "star", 1);
    s.replace(other.data);
    expect(calls).toBe(1);
    expect(new Store(kv).data.order).toHaveLength(1);
  });
});
