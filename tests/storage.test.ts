import { describe, expect, it } from "vitest";
import { recordSet, streakToday, weekStrip } from "../src/core/profiles.ts";
import { Store, exportJSON, importJSON, memoryKV, migrate, STORAGE_KEY } from "../src/core/storage.ts";
import type { SetSummary } from "../src/core/session.ts";

const summary = (score: number): SetSummary => ({
  seed: { tier: 1, step: 0 }, score, total: 5, stars: score >= 5 ? 3 : score >= 3 ? 2 : 1,
  nextSeed: score >= 4 ? { tier: 1, step: 1 } : { tier: 1, step: 0 }, peakTier: 2, firstTries: [],
});

describe("storage", () => {
  it("starts empty, adds a profile and persists it", () => {
    const kv = memoryKV();
    const store = new Store(kv);
    expect(store.data.order).toEqual([]);
    const p = store.addProfile("Bình", "rocket", Date.UTC(2026, 9, 17));
    store.setActive(p.id);
    const again = new Store(kv);
    expect(again.activeProfile?.name).toBe("Bình");
    expect(again.activeProfile?.games.robot.seed).toEqual({ tier: 1, step: 0 });
  });

  it("survives garbage in storage", () => {
    const store = new Store(memoryKV({ [STORAGE_KEY]: "{not json" }));
    expect(store.data.profiles).toEqual({});
  });

  it("export → import round-trips; foreign files are refused with a Vietnamese message", () => {
    const store = new Store(memoryKV());
    store.addProfile("An", "rainbow");
    const back = importJSON(exportJSON(store.data));
    expect(Object.values(back.profiles)[0]?.name).toBe("An");
    expect(() => importJSON("{}")).toThrow(/sao lưu/);
    expect(() => importJSON("nope")).toThrow(/không đọc được/);
  });

  it("repairs partial profiles from older saves", () => {
    const d = migrate({ schema: 1, profiles: { x: { name: "Chi", games: { robot: { seed: { tier: 9, step: 9 } } } } } });
    expect(d?.profiles.x?.games.robot.seed).toEqual({ tier: 3, step: 2 });
    expect(d?.profiles.x?.games.scale.sets).toBe(0);
    expect(d?.order).toEqual(["x"]);
  });

  describe("schema 1 → 2 (So sánh cân folded into Thăng bằng, Quy luật added)", () => {
    const old = {
      schema: 1,
      profiles: {
        x: {
          name: "Chi",
          games: {
            scale: { seed: { tier: 3, step: 1 }, sets: 4, bestStars: 2 },
            compare: { seed: { tier: 2, step: 0 }, sets: 2, bestStars: 3 },
            robot: { seed: { tier: 2, step: 1 }, sets: 1, bestStars: 1 },
          },
          history: [{ game: "compare", day: "2026-10-15", at: 1, seed: { tier: 1, step: 0 }, score: 4, total: 5, stars: 2, peakTier: 2 }],
        },
        y: { name: "Hà", games: { scale: { seed: { tier: 1, step: 1 }, sets: 1, bestStars: 1 } } },
      },
    };

    it("drops compare progress, adds a fresh Quy luật, keeps the history", () => {
      const d = migrate(old)!;
      expect(d.schema).toBe(2);
      const x = d.profiles.x!;
      expect(Object.keys(x.games)).not.toContain("compare");
      expect(x.games.pattern).toMatchObject({ sets: 0, seed: { tier: 1, step: 0 } });
      expect(x.history).toHaveLength(1);
      expect(x.history[0]!.game).toBe("compare");
      expect(x.games.robot.seed).toEqual({ tier: 2, step: 1 }); // other games are untouched
    });

    it("a scale seed beyond Vòng 1 step 2 restarts there; an earlier one stays", () => {
      const d = migrate(old)!;
      expect(d.profiles.x!.games.scale.seed).toEqual({ tier: 1, step: 2 });
      expect(d.profiles.x!.games.scale.sets).toBe(4); // stars and sets are kept
      expect(d.profiles.y!.games.scale.seed).toEqual({ tier: 1, step: 1 });
    });

    it("a schema-2 save loads unchanged (no second cap)", () => {
      const once = migrate(old)!;
      const p = once.profiles.x!;
      const moved = { ...once, profiles: { ...once.profiles, x: { ...p, games: { ...p.games, scale: { ...p.games.scale, seed: { tier: 3, step: 0 } } } } } };
      expect(migrate(JSON.parse(JSON.stringify(moved)))!.profiles.x!.games.scale.seed).toEqual({ tier: 3, step: 0 });
    });

    it("importing an old backup works; a newer schema is refused", () => {
      const file = JSON.stringify({ app: "tham-tu-toan-hoc", exportedAt: "2026-10-16T00:00:00Z", data: old });
      expect(Object.keys(importJSON(file).profiles)).toEqual(["x", "y"]);
      expect(migrate({ ...old, schema: 3 })).toBeNull();
    });

    it("the history of an old Store is not lost on load", () => {
      const store = new Store(memoryKV({ [STORAGE_KEY]: JSON.stringify(old) }));
      expect(store.data.profiles.x!.history).toHaveLength(1);
    });
  });

  it("recordSet updates stars, streak, seed and history", () => {
    const store = new Store(memoryKV());
    const p0 = store.addProfile("Dũng", "kite", new Date(2026, 9, 12, 9).getTime());
    const settings = store.data.settings;
    let p = recordSet(p0, "scale", summary(5), settings, 0, "2026-10-12");
    p = recordSet(p, "robot", summary(2), settings, 0, "2026-10-13");
    expect(p.stars).toBe(4);
    expect(p.games.scale.seed).toEqual({ tier: 1, step: 1 });
    expect(p.games.scale.bestStars).toBe(3);
    expect(p.history).toHaveLength(2);
    expect(streakToday(p, "2026-10-13", settings)).toBe(2);
    const week = weekStrip(p, "2026-10-14", settings);
    expect(week.map((w) => w.status)).toEqual(["star", "star", "today", "future", "future", "future", "future"]);
  });
});
