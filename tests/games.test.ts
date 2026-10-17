// Property tests: for every game, every difficulty position and many seeds, the
// generated question must be valid and solvable, and solve() must pass check().
import { describe, expect, it } from "vitest";
import { CLIPS } from "../src/audio/manifest.ts";
import { fromIndex } from "../src/core/difficulty.ts";
import { createRng } from "../src/core/rng.ts";
import type { Position } from "../src/core/types.ts";
import { basketLogic, BAG_SIZE } from "../src/games/basket/logic.ts";
import * as basketText from "../src/games/basket/text.ts";
import { compareLogic } from "../src/games/compare/logic.ts";
import { countSolutions, equationsLogic, isChainSolvable } from "../src/games/equations/logic.ts";
import { GAMES } from "../src/games/index.ts";
import { robotLogic, shortestPath, simulate } from "../src/games/robot/logic.ts";
import { scaleLogic, weightOf } from "../src/games/scale/logic.ts";
import { splitLogic } from "../src/games/split/logic.ts";
import * as splitText from "../src/games/split/text.ts";
import { numberWords } from "../src/i18n/numbers.ts";
import { numberClips, say } from "../src/i18n/speech.ts";

const POSITIONS: Position[] = Array.from({ length: 9 }, (_, i) => fromIndex(i));
const SEEDS = 150;

function each<Q>(gen: (p: Position, seed: number) => Q, fn: (q: Q, p: Position) => void) {
  for (const p of POSITIONS) for (let s = 1; s <= SEEDS; s++) fn(gen(p, s), p);
}

describe("every game: solve() passes check()", () => {
  for (const g of GAMES) {
    it(g.id, () => {
      each((p, s) => g.logic.generate(p, createRng(s * 7919 + p.tier)), (q) => {
        const a = g.logic.solve!(q);
        expect(g.logic.check(q, a).correct).toBe(true);
      });
    });
  }
});

describe("scale", () => {
  it("pans start unequal and the tray can balance them", () => {
    each((p, s) => scaleLogic.generate(p, createRng(s)), (q, p) => {
      expect(weightOf(q.left)).not.toBe(weightOf(q.right));
      if (p.tier === 1) expect(new Set([...q.left, ...q.right, ...q.tray])).toEqual(new Set(["red_apple"]));
      expect(q.liveTilt).toBe(p.tier === 1);
    });
  });
  it("adding to the heavier pan is wrong", () => {
    const q = { left: ["red_apple"], right: [], tray: ["grapes", "grapes"], key: [], liveTilt: false, showCounts: false } as const;
    expect(scaleLogic.check({ ...q, left: [...q.left], right: [], tray: [...q.tray], key: [] }, { addedLeft: ["grapes"], addedRight: [] }).reason).toBe("leftHeavier");
    expect(scaleLogic.check({ ...q, left: [...q.left], right: [], tray: [...q.tray], key: [] }, { addedLeft: [], addedRight: ["grapes", "grapes"] }).correct).toBe(true);
    expect(scaleLogic.check({ ...q, left: [...q.left], right: [], tray: [...q.tray], key: [] }, { addedLeft: [], addedRight: ["red_apple"] }).reason).toBe("invalid");
  });
});

describe("robot", () => {
  it("levels are reachable, within program length, and get harder", () => {
    each((p, s) => robotLogic.generate(p, createRng(s)), (q, p) => {
      const path = shortestPath(q)!;
      expect(path).not.toBeNull();
      expect(path.length).toBe(q.shortest);
      expect(path.length).toBeLessThanOrEqual(q.maxSteps);
      expect(q.size).toBe([4, 5, 6][p.tier - 1]);
      if (p.tier === 1) expect(q.walls).toHaveLength(0);
    });
  });
  it("crashing into a wall is reported with the step number", () => {
    const q = robotLogic.generate({ tier: 1, step: 0 }, createRng(3));
    const t = simulate({ ...q, walls: [] }, ["D", "D", "D", "D", "D"]);
    expect(t.crashAt).toBeGreaterThanOrEqual(0);
    expect(robotLogic.check(q, []).reason).toBe("empty");
  });
});

describe("basket", () => {
  it("tier 2 covers whole tens, plain ten, tens+ones; at least 10 loose", () => {
    const kinds = new Set<string>();
    for (let s = 1; s < 300; s++) {
      const q = basketLogic.generate({ tier: 2, step: 0 }, createRng(s));
      kinds.add(q.tens!.kind);
      expect(q.loose.tangerine).toBeGreaterThanOrEqual(10);
      expect(q.want.tangerine).toBe(q.tens!.tens * BAG_SIZE + q.tens!.ones);
    }
    expect(kinds).toEqual(new Set(["wholeTens", "plainTen", "tensOnes"]));
  });
  it("ten loose oranges count as one chục", () => {
    const q = { want: { tangerine: 10 }, order: ["tangerine"], loose: { tangerine: 12 }, bags: 2, tens: { kind: "wholeTens", tens: 1, ones: 0 }, showCounts: false } as const;
    const r = basketLogic.check({ ...q, order: ["tangerine"], want: { ...q.want }, loose: { ...q.loose }, tens: { ...q.tens } }, { loose: { tangerine: 10 }, bags: 0 });
    expect(r.correct).toBe(true);
    expect(r.reason).toBe("looseTen");
  });
  it("prompts read naturally", () => {
    const base = { order: ["tangerine" as const], loose: {}, bags: 2, showCounts: false };
    expect(basketText.prompt({ ...base, want: { tangerine: 20 }, tens: { kind: "wholeTens", tens: 2, ones: 0 } }).text).toBe("Đưa cho Mèo hai chục quả cam nhé!");
    expect(basketText.prompt({ ...base, want: { tangerine: 13 }, tens: { kind: "tensOnes", tens: 1, ones: 3 } }).text).toBe("Đưa cho Mèo mười ba quả cam nhé!");
    expect(basketText.prompt({ ...base, want: { tangerine: 10 }, tens: { kind: "plainTen", tens: 1, ones: 0 } }).text).toBe("Đưa cho Mèo mười quả cam nhé!");
    expect(basketText.prompt({ order: ["tangerine", "red_apple"], loose: {}, bags: 0, showCounts: false, want: { tangerine: 2, red_apple: 3 }, tens: null }).text)
      .toBe("Đưa cho Mèo hai quả cam và ba quả táo nhé!");
    expect(basketText.tensReading({ order: ["tangerine"], loose: {}, bags: 2, showCounts: false, want: { tangerine: 20 }, tens: { kind: "wholeTens", tens: 2, ones: 0 } })).toBe("Hai chục là 20 quả cam.");
  });
});

describe("equations", () => {
  it("every puzzle is chain-solvable, unique, and within 20", () => {
    each((p, s) => equationsLogic.generate(p, createRng(s)), (q, p) => {
      expect(isChainSolvable(q)).toBe(true);
      expect(countSolutions(q)).toBe(1);
      expect(q.answer).toBeLessThanOrEqual(20);
      q.clues.forEach((c) => expect(c.total).toBeLessThanOrEqual(20));
      if (p.tier === 1) expect(q.clues).toHaveLength(0);
      if (p.tier === 3) expect(q.clues.length).toBeGreaterThanOrEqual(3);
    });
  });
  it("detects puzzles that need two clues at once", () => {
    const q = { known: [], clues: [{ terms: ["red_apple", "pear"], total: 3 }, { terms: ["red_apple", "red_apple", "pear"], total: 4 }], ask: ["pear"], answer: 2 } as never;
    expect(isChainSolvable(q)).toBe(false);
  });
});

describe("split", () => {
  it("parts add up; blanks follow the tier", () => {
    each((p, s) => splitLogic.generate(p, createRng(s)), (q, p) => {
      expect(q.a + q.b).toBe(q.whole);
      expect(q.layout).toHaveLength(q.whole);
      expect(q.blanks).toEqual(p.tier === 1 ? ["whole"] : p.tier === 2 ? ["a", "b"] : [expect.stringMatching(/^[ab]$/)]);
      expect(q.whole).toBeLessThanOrEqual(20);
    });
  });
  it("swapped parts get their own hint", () => {
    const q = { mode: "picture+bond", scene: "vase", whole: 6, a: 4, b: 2, blanks: ["a", "b"], layout: [] } as never;
    expect(splitLogic.check(q, { a: 2, b: 4 }).reason).toBe("swapped");
    expect(splitText.prompt({ ...(q as object), mode: "bond", blanks: ["b"], whole: 7, a: 3, b: 4 } as never).text).toBe("Bảy gồm ba và mấy?");
  });
});

describe("compare", () => {
  it("weighings agree with the hidden order and are enough to find it", () => {
    each((p, s) => compareLogic.generate(p, createRng(s)), (q, p) => {
      expect(q.items).toHaveLength(p.tier === 1 ? 3 : 4);
      expect(q.weighings).toHaveLength(q.items.length - 1);
      for (const w of q.weighings) {
        const heavy = w.heavier === "left" ? w.left : w.right, light = w.heavier === "left" ? w.right : w.left;
        expect(q.truth.indexOf(heavy)).toBeGreaterThan(q.truth.indexOf(light));
      }
      if (p.tier === 1) q.weighings.forEach((w) => expect(w.heavier).toBe("right"));
    });
  });
});

describe("Vietnamese numbers and speech", () => {
  it("number words", () => {
    expect([0, 1, 5, 10, 11, 14, 15, 20, 21, 24, 25, 30, 99, 100].map(numberWords)).toEqual([
      "không", "một", "năm", "mười", "mười một", "mười bốn", "mười lăm", "hai mươi", "hai mươi mốt",
      "hai mươi tư", "hai mươi lăm", "ba mươi", "chín mươi chín", "một trăm",
    ]);
  });
  it("number clips read the same words", () => {
    for (let n = 0; n <= 100; n++) expect(numberClips(n).map((c) => CLIPS[c]).join(" ")).toBe(numberWords(n));
  });
  it("say() joins text and clips", () => {
    expect(say("give_meo", 3, "fruit_cam", "nhe")).toEqual({ text: "Đưa cho Mèo ba quả cam nhé!", clips: ["give_meo", "n3", "fruit_cam", "nhe"] });
  });
});
