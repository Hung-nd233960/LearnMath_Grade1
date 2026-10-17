import { describe, expect, it } from "vitest";
import { changeBonus, dailyLeftNow, defaultLimits, lockEarly, MAX_BONUS_MIN, newUsage, tick, type Usage } from "../src/core/screentime.ts";

const L = defaultLimits(); // 30 minutes a day
const day = "2026-10-17";
const fresh = () => newUsage(day, 0);

describe("adults changing today's time", () => {
  it("+10 and +20 add to today's limit", () => {
    expect(dailyLeftNow(changeBonus(fresh(), 10, L), L, day)).toBe(40 * 60000);
    expect(dailyLeftNow(changeBonus(changeBonus(fresh(), 10, L), 20, L), L, day)).toBe(60 * 60000);
  });

  it("−10 undoes a misclicked +10", () => {
    const u = changeBonus(changeBonus(fresh(), 10, L), -10, L);
    expect(u.bonusMs).toBe(0);
    expect(dailyLeftNow(u, L, day)).toBe(30 * 60000);
  });

  it("−20 takes real time away from the normal limit too", () => {
    expect(dailyLeftNow(changeBonus(fresh(), -20, L), L, day)).toBe(10 * 60000);
  });

  it("cannot take away more than there is, or add more than the maximum", () => {
    expect(changeBonus(fresh(), -500, L).bonusMs).toBe(-L.dailyMin * 60000);
    expect(dailyLeftNow(changeBonus(fresh(), -500, L), L, day)).toBe(0);
    expect(changeBonus(fresh(), 5000, L).bonusMs).toBe(MAX_BONUS_MIN * 60000);
  });

  it("taking away time already played locks the child at the next set, adding it back unlocks", () => {
    let u: Usage = { ...fresh(), playedMs: 25 * 60000, lastTickAt: 0, lastInputAt: 0 };
    u = changeBonus(u, -10, L); // limit is now 20 minutes: 25 are played
    expect(tick(u, 1000, L, day).lockDue).toBe(true);
    u = changeBonus(u, 10, L);
    expect(tick(u, 1000, L, day).lockDue).toBe(false);
  });
});

describe("ending the day early (Cho bé nghỉ sớm)", () => {
  it("makes the lock due although plenty of time is left", () => {
    const u = lockEarly(fresh());
    const r = tick(u, 1000, L, day);
    expect(r.lockDue).toBe(true);
    expect(r.breakDue).toBe(false);
    expect(r.dailyLeftMs).toBe(0);
    expect(dailyLeftNow(u, L, day)).toBe(0);
  });

  it("does not play the 'two minutes left' warning for a day that was ended on purpose", () => {
    let u = lockEarly({ ...fresh(), playedMs: 29 * 60000 });
    const events: string[] = [];
    for (let t = 0; t < 5000; t += 1000) { const r = tick(u, t, L, day); u = r.usage; events.push(...r.events); }
    expect(events).not.toContain("warnDaily");
  });

  it("is ended by adding time, but not by taking time away", () => {
    const stopped = lockEarly(fresh());
    expect(changeBonus(stopped, -10, L).lockedEarly).toBe(true);
    const back = changeBonus(stopped, 10, L);
    expect(back.lockedEarly).toBe(false);
    expect(tick(back, 1000, L, day).lockDue).toBe(false);
  });

  it("ends by itself on the next day", () => {
    const stopped = lockEarly(fresh());
    const next = tick(stopped, 86_400_000, L, "2026-10-18");
    expect(next.lockDue).toBe(false);
    expect(next.usage.lockedEarly).toBe(false);
    expect(dailyLeftNow(stopped, L, "2026-10-18")).toBe(30 * 60000);
  });

  it("an older save without the flag behaves as before", () => {
    const old: Usage = { ...fresh() };
    delete (old as Partial<Usage>).lockedEarly;
    expect(tick(old, 1000, L, day).lockDue).toBe(false);
  });
});
