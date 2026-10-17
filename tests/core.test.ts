import { describe, expect, it } from "vitest";
import { addDays, dayKey, isWeekend, weekdayIndex } from "../src/core/dates.ts";
import { afterFirstTry, fromIndex, nextSeed, startSet, toIndex, type SetDifficulty } from "../src/core/difficulty.ts";
import { checkPin, makePin } from "../src/core/pin.ts";
import { currentStreak, recordStarDay, starsForSet, EMPTY_STREAK } from "../src/core/rewards.ts";
import { createRng } from "../src/core/rng.ts";
import { defaultLimits, grantBonus, newUsage, noteInput, startBreak, tick } from "../src/core/screentime.ts";
import { SetRunner } from "../src/core/session.ts";
import type { GameLogic, Position } from "../src/core/types.ts";

const run = (start: Position, answers: boolean[]): SetDifficulty =>
  answers.reduce((s, ok) => afterFirstTry(s, ok), startSet(start));

describe("difficulty", () => {
  it("index round-trips", () => {
    for (let i = 0; i < 9; i++) expect(toIndex(fromIndex(i))).toBe(i);
    expect(fromIndex(99)).toEqual({ tier: 3, step: 2 });
    expect(fromIndex(-3)).toEqual({ tier: 1, step: 0 });
  });

  it("tier 1 → 2 after one correct answer when there were no mistakes", () => {
    expect(run({ tier: 1, step: 0 }, [true]).pos).toEqual({ tier: 2, step: 0 });
  });

  it("a mistake at tier 1 means 1 + 1 more correct answers before tier 2", () => {
    const s = run({ tier: 1, step: 0 }, [false, true]);
    expect(s.pos.tier).toBe(1);
    expect(run({ tier: 1, step: 0 }, [false, true, true]).pos.tier).toBe(2);
  });

  it("tier 2 always needs at least 2 correct answers before tier 3", () => {
    const s = run({ tier: 2, step: 0 }, [true]);
    expect(s.pos.tier).toBe(2);
    expect(run({ tier: 2, step: 0 }, [true, true]).pos.tier).toBe(3);
  });

  it("can rise at most one tier above the set's start", () => {
    const s = run({ tier: 1, step: 0 }, [true, true, true, true, true]);
    expect(s.pos.tier).toBe(2);
  });

  it("two wrong in a row drop a tier", () => {
    const s = run({ tier: 2, step: 1 }, [false, false]);
    expect(s.pos).toEqual({ tier: 1, step: 2 });
    expect(run({ tier: 1, step: 0 }, [false, false]).pos).toEqual({ tier: 1, step: 0 });
  });

  it("next seed moves one hidden step", () => {
    expect(nextSeed({ tier: 1, step: 2 }, 5)).toEqual({ tier: 2, step: 0 });
    expect(nextSeed({ tier: 2, step: 0 }, 1)).toEqual({ tier: 1, step: 2 });
    expect(nextSeed({ tier: 2, step: 1 }, 3)).toEqual({ tier: 2, step: 1 });
    expect(nextSeed({ tier: 3, step: 2 }, 5)).toEqual({ tier: 3, step: 2 });
    expect(nextSeed({ tier: 1, step: 0 }, 0)).toEqual({ tier: 1, step: 0 });
  });

  it("reaching tier 3 as a starting point takes several good sets", () => {
    let seed: Position = { tier: 1, step: 0 };
    let sets = 0;
    while (seed.tier < 3) { seed = nextSeed(seed, 5); sets++; }
    expect(sets).toBe(6);
  });
});

describe("stars and streak", () => {
  it("stars per set", () => {
    expect([0, 1, 2, 3, 4, 5].map(starsForSet)).toEqual([1, 1, 1, 2, 2, 3]);
  });

  it("streak grows on consecutive days and resets after a missed school day", () => {
    let s = recordStarDay(EMPTY_STREAK, "2026-10-12", true); // Mon
    s = recordStarDay(s, "2026-10-13", true);
    expect(s.count).toBe(2);
    expect(recordStarDay(s, "2026-10-13", true).count).toBe(2); // same day: no change
    expect(recordStarDay(s, "2026-10-15", true).count).toBe(1); // missed Wed
  });

  it("weekends do not break the streak when skipWeekends is on", () => {
    const fri = recordStarDay({ count: 4, lastDay: "2026-10-09" }, "2026-10-09", true);
    expect(recordStarDay(fri, "2026-10-12", true).count).toBe(5); // Fri → Mon
    expect(recordStarDay(fri, "2026-10-12", false).count).toBe(1);
    expect(currentStreak(fri, "2026-10-11", true)).toBe(4); // Sunday: still alive
    expect(currentStreak(fri, "2026-10-13", true)).toBe(0); // Tuesday: Monday was missed
  });

  it("dates", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(isWeekend("2026-10-17")).toBe(true); // Saturday
    expect(weekdayIndex("2026-10-12")).toBe(0); // Monday
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("screen time", () => {
  const L = defaultLimits();
  const day = "2026-10-17";
  const playFor = (ms: number, startAt = 0) => {
    let u = newUsage(day, startAt);
    let t = startAt;
    let last = tick(u, t, L, day);
    u = last.usage;
    while (t < startAt + ms) { t += 1000; u = noteInput(u, t); last = tick(u, t, L, day); u = last.usage; }
    return last;
  };

  it("counts active time and asks for a break after sessionMin", () => {
    const r = playFor(15 * 60000);
    expect(r.usage.playedMs).toBe(15 * 60000);
    expect(r.breakDue).toBe(true);
    expect(r.lockDue).toBe(false);
  });

  it("idle time is not counted; nudge then pause fire once", () => {
    let u = newUsage(day, 0);
    const events: string[] = [];
    for (let t = 0; t <= 90000; t += 1000) { const r = tick(u, t, L, day); u = r.usage; events.push(...r.events); }
    expect(events.filter((e) => e === "idleNudge")).toHaveLength(1);
    expect(events.filter((e) => e === "idlePause")).toHaveLength(1);
    expect(u.playedMs).toBe((L.idlePauseSec - 1) * 1000); // the tick that reaches the pause limit is not counted
  });

  it("warns 2 minutes before the daily limit, then locks; bonus time unlocks", () => {
    const r = playFor(30 * 60000);
    expect(r.lockDue).toBe(true);
    expect(r.mode).toBe("locked");
    const more = tick(grantBonus(noteInput(r.usage, 30 * 60000 + 1000), 10), 30 * 60000 + 1000, L, day);
    expect(more.lockDue).toBe(false);
    expect(more.dailyLeftMs).toBeGreaterThan(9 * 60000);
  });

  it("a break blocks counting and ends with breakOver", () => {
    let u = startBreak(newUsage(day, 0), 0, L);
    expect(tick(u, 1000, L, day).mode).toBe("break");
    const r = tick(u, L.breakMin * 60000 + 1, L, day);
    expect(r.events).toContain("breakOver");
    expect(r.usage.sessionMs).toBe(0);
    u = r.usage;
    expect(u.breakUntil).toBeNull();
  });

  it("a new day resets usage", () => {
    const r = tick({ ...newUsage("2026-10-16", 0), playedMs: 999999 }, 1000, L, day);
    expect(r.events).toContain("newDay");
    expect(r.usage.playedMs).toBe(0);
  });
});

describe("pin", () => {
  it("checks a pin", () => {
    const rec = makePin("2468", "salt");
    expect(checkPin(rec, "2468")).toBe(true);
    expect(checkPin(rec, "1234")).toBe(false);
    expect(checkPin(rec, "24680")).toBe(false);
  });
});

describe("SetRunner", () => {
  // Fake game: the question is the tier; the right answer is "ok".
  const fake: GameLogic<{ tier: number; n: number }, string> = {
    id: "split",
    generate: (p, rng) => ({ tier: p.tier, n: rng.int(0, 1000) }),
    check: (_q, a) => ({ correct: a === "ok", reason: a === "ok" ? "right" : "wrong" }),
    solve: () => "ok",
  };

  it("first try counts, retry does not, then reveal", () => {
    const r = new SetRunner(fake, { tier: 1, step: 0 }, createRng(1));
    expect(r.answer("no").outcome).toBe("retry");
    expect(r.answer("ok").outcome).toBe("correctOnRetry");
    r.next();
    expect(r.answer("no").outcome).toBe("retry");
    expect(r.answer("no").outcome).toBe("reveal");
    r.next();
    for (let i = 0; i < 3; i++) { expect(r.answer("ok").outcome).toBe("correct"); r.next(); }
    expect(r.finished).toBe(true);
    const s = r.summary();
    expect(s.score).toBe(3);
    expect(s.stars).toBe(2);
    expect(s.firstTries).toEqual([false, false, true, true, true]);
  });

  it("questions follow the difficulty position", () => {
    const r = new SetRunner(fake, { tier: 1, step: 0 }, createRng(2));
    expect(r.question.tier).toBe(1);
    r.answer("ok"); r.next();
    expect(r.question.tier).toBe(2);
    expect(r.position.tier).toBe(2);
  });
});
