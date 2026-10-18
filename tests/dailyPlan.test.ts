import { describe, expect, it } from "vitest";
import { chooseGames, ensurePlan, gameStats, markDone, nextGame, planComplete, tileState, type DailyPlan } from "../src/core/dailyPlan.ts";
import { toIndex } from "../src/core/difficulty.ts";
import { completeInPlan, createProfile, recordPractice, recordSet, repairProfile, type Profile } from "../src/core/profiles.ts";
import { createRng } from "../src/core/rng.ts";
import type { SetSummary } from "../src/core/session.ts";
import { defaultSettings, sanitizeDaily } from "../src/core/settings.ts";
import { migrate } from "../src/core/storage.ts";
import { GAME_IDS, type GameId, type Position } from "../src/core/types.ts";

const ALL: readonly GameId[] = GAME_IDS;
const TODAY = "2026-10-19";
const DAILY = (gamesPerDay: number, order: "warmup" | "random" = "warmup") => ({ gamesPerDay, order });

/** A child whose games have these levels (position index 0–8) and last-played days. */
function child(levels: Partial<Record<GameId, number>> = {}, played: Partial<Record<GameId, string>> = {}): Profile {
  const p = createProfile("Bé", "rocket", 0, TODAY, "p1");
  for (const g of ALL) {
    const i = levels[g] ?? 0;
    p.games[g] = { ...p.games[g], seed: { tier: (Math.floor(i / 3) + 1) as 1 | 2 | 3, step: i % 3 }, lastPlayed: played[g] ?? null };
  }
  return p;
}

const summary = (score: number): SetSummary => ({
  seed: { tier: 1, step: 0 }, score, total: 5, stars: score >= 5 ? 3 : score >= 3 ? 2 : 1,
  nextSeed: score >= 4 ? { tier: 1, step: 1 } : { tier: 1, step: 0 }, peakTier: 1, firstTries: [],
});

describe("daily plan: which games", () => {
  it("picks the games played least recently, never-played ones first", () => {
    const p = child({}, { scale: "2026-10-18", robot: "2026-10-17", basket: "2026-10-16" });
    for (let seed = 1; seed <= 30; seed++) {
      const plan = ensurePlan(p, DAILY(3), TODAY, ALL, createRng(seed))!;
      expect([...plan.games].sort()).toEqual(["equations", "pattern", "split"]);
    }
    // with three never played, the oldest of the played ones come next
    const q = child({}, { scale: "2026-10-18", robot: "2026-10-17", basket: "2026-10-16", equations: "2026-10-15" });
    expect([...ensurePlan(q, DAILY(5), TODAY, ALL, createRng(1))!.games].sort()).toEqual(["basket", "equations", "pattern", "robot", "split"]);
  });

  it("a tie in recency goes to the lower level", () => {
    const p = child({ scale: 5, robot: 1, basket: 3, equations: 0, split: 7, pattern: 2 });
    const plan = ensurePlan(p, DAILY(3), TODAY, ALL, createRng(3))!;
    expect([...plan.games].sort()).toEqual(["equations", "pattern", "robot"]); // levels 0, 1, 2
  });

  it("never plans a game that is not ready", () => {
    const plan = ensurePlan(child(), DAILY(6), TODAY, ["scale", "robot"], createRng(1))!;
    expect(plan.games.sort()).toEqual(["robot", "scale"]); // 6 wanted, 2 exist
  });
});

describe("daily plan: the order", () => {
  it("warm-up: lowest level first", () => {
    const p = child({ scale: 6, robot: 2, basket: 4, equations: 8, split: 1, pattern: 5 }, { scale: "2026-10-18" });
    const plan = ensurePlan(p, DAILY(4), TODAY, ALL, createRng(5))!;
    const idx = plan.games.map((g) => toIndex(p.games[g].seed));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  it("warm-up ties are broken by chance, but the same seed gives the same order", () => {
    const p = child(); // every game at level 0
    const orders = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const a = chooseGames(gameStats(p, ALL), 3, "warmup", createRng(seed));
      expect(chooseGames(gameStats(p, ALL), 3, "warmup", createRng(seed))).toEqual(a);
      orders.add(a.join());
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("random: the same games, in different orders", () => {
    const p = child({ scale: 6, robot: 2, basket: 4 }, { equations: "2026-10-18", split: "2026-10-18", pattern: "2026-10-18" });
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const plan = ensurePlan(p, DAILY(3, "random"), TODAY, ALL, createRng(seed))!;
      expect([...plan.games].sort()).toEqual(["basket", "robot", "scale"]);
      orders.add(plan.games.join());
    }
    expect(orders.size).toBeGreaterThan(2);
  });
});

describe("daily plan: one plan a day", () => {
  it("the same plan comes back all day (the very same object), and a new one tomorrow", () => {
    const p = child();
    const plan = ensurePlan(p, DAILY(3), TODAY, ALL, createRng(1))!;
    const withPlan = { ...p, plan };
    expect(ensurePlan(withPlan, DAILY(3), TODAY, ALL, createRng(99))).toBe(plan);
    const tomorrow = ensurePlan(withPlan, DAILY(3), "2026-10-20", ALL, createRng(2))!;
    expect(tomorrow.day).toBe("2026-10-20");
    expect(tomorrow.done).toEqual([]);
  });

  it("switched off: no plan, every tile open", () => {
    expect(ensurePlan(child(), DAILY(0), TODAY, ALL, createRng(1))).toBeNull();
    for (const g of ALL) expect(tileState(null, g)).toBe("open");
  });

  it("changing the number mid-day keeps the finished games where they are", () => {
    const p = child();
    let plan: DailyPlan = { day: TODAY, games: ["scale", "robot", "basket"], done: ["scale"] };
    // more games: appended at the end
    const more = ensurePlan({ ...p, plan }, DAILY(5), TODAY, ALL, createRng(4))!;
    expect(more.games.slice(0, 3)).toEqual(["scale", "robot", "basket"]);
    expect(more.games).toHaveLength(5);
    expect(more.done).toEqual(["scale"]);
    // fewer: unfinished ones drop from the end
    const fewer = ensurePlan({ ...p, plan }, DAILY(2), TODAY, ALL, createRng(4))!;
    expect(fewer.games).toEqual(["scale", "robot"]);
    expect(fewer.done).toEqual(["scale"]);
    // fewer than the games already finished: the finished ones stay
    plan = { day: TODAY, games: ["scale", "robot", "basket"], done: ["scale", "robot"] };
    const one = ensurePlan({ ...p, plan }, DAILY(1), TODAY, ALL, createRng(4))!;
    expect(one.games).toEqual(["scale", "robot"]);
    expect(one.done).toEqual(["scale", "robot"]);
  });
});

describe("daily plan: playing it", () => {
  const plan: DailyPlan = { day: TODAY, games: ["split", "robot", "scale"], done: [] };

  it("only the next game is open; the others wait or are not today's", () => {
    expect(nextGame(plan)).toBe("split");
    expect(tileState(plan, "split")).toBe("next");
    expect(tileState(plan, "robot")).toBe("later");
    expect(tileState(plan, "pattern")).toBe("notToday");
  });

  it("finishing the next game opens the one after it; finished games are 'done' (open for a replay)", () => {
    const next = markDone(plan, "split");
    expect(tileState(next, "split")).toBe("done");
    expect(tileState(next, "robot")).toBe("next");
    expect(planComplete(next)).toBe(false);
    const all = markDone(markDone(next, "robot"), "scale");
    expect(planComplete(all)).toBe(true);
    expect(nextGame(all)).toBeNull();
    expect(tileState(all, "pattern")).toBe("notToday"); // games outside the plan stay locked all day
    expect(["split", "robot", "scale"].map((g) => tileState(all, g as GameId))).toEqual(["done", "done", "done"]);
  });

  it("markDone of a game that is not the next one changes nothing", () => {
    expect(markDone(plan, "scale")).toBe(plan);
    expect(markDone(plan, "pattern")).toBe(plan);
    expect(markDone(markDone(plan, "split"), "split").done).toEqual(["split"]);
  });

  it("a set left half-way changes nothing: only a recorded set finishes the game", () => {
    const p = { ...child(), plan };
    expect(nextGame(p.plan!)).toBe("split"); // nothing was recorded, so it is still the next game
    const finished = completeInPlan(recordSet(p, "split", summary(4), defaultSettings(), 0, TODAY), "split", TODAY);
    expect(nextGame(finished.plan!)).toBe("robot");
    // yesterday's plan is never ticked
    expect(completeInPlan({ ...p, plan: { ...plan, day: "2026-10-18" } }, "split", TODAY).plan!.done).toEqual([]);
  });
});

describe("replay for no credit", () => {
  it("recordPractice keeps the history and changes nothing else", () => {
    const p = { ...child(), stars: 7 };
    const after = recordPractice(p, "scale", summary(5), 123, TODAY);
    expect(after.stars).toBe(7);
    expect(after.starsByDay).toEqual(p.starsByDay);
    expect(after.streak).toEqual(p.streak);
    expect(after.games).toEqual(p.games); // seed, sets, best stars, last played
    expect(after.history).toHaveLength(1);
    expect(after.history[0]).toMatchObject({ game: "scale", practice: true, score: 5 });
  });
});

describe("daily settings and saves", () => {
  it("sanitizeDaily keeps good values and repairs bad ones", () => {
    expect(sanitizeDaily({ gamesPerDay: 4, order: "random" })).toEqual({ gamesPerDay: 4, order: "random" });
    expect(sanitizeDaily({ gamesPerDay: 0 })).toEqual({ gamesPerDay: 0, order: "warmup" });
    expect(sanitizeDaily({ gamesPerDay: 99, order: "x" as never })).toEqual({ gamesPerDay: 3, order: "warmup" });
    expect(sanitizeDaily({ gamesPerDay: 2.5 })).toEqual({ gamesPerDay: 3, order: "warmup" });
    expect(sanitizeDaily(undefined)).toEqual({ gamesPerDay: 3, order: "warmup" });
  });

  it("an older save without the setting gets the defaults, and without a plan", () => {
    const d = migrate({ schema: 2, profiles: { x: { name: "Chi" } }, settings: {} })!;
    expect(d.settings.daily).toEqual({ gamesPerDay: 3, order: "warmup" });
    expect(d.profiles.x!.plan).toBeNull();
  });

  it("a stored plan survives, a broken one is dropped", () => {
    const plan = { day: TODAY, games: ["scale", "robot"], done: ["scale"] };
    expect(repairProfile({ id: "x", plan } as never, 0, TODAY).plan).toEqual(plan);
    expect(repairProfile({ id: "x", plan: { day: TODAY, games: "nope", done: [] } } as never, 0, TODAY).plan).toBeNull();
    expect(repairProfile({ id: "x", plan: { day: TODAY, games: ["scale", "compare"], done: ["robot"] } } as never, 0, TODAY).plan).toEqual({ day: TODAY, games: ["scale"], done: [] });
  });
});

describe("positions used by the tests", () => {
  it("level 0–8 map onto tier and step", () => {
    const p = child({ scale: 7 });
    expect(p.games.scale.seed).toEqual({ tier: 3, step: 1 } satisfies Position);
  });
});
