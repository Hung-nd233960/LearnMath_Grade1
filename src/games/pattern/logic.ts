// Game 6 — Quy luật (patterns). Find the missing picture, number or cell.
//
// The rule of this game: only puzzles with exactly ONE answer. Every generated question is checked by
// trying each option (`fittingOptions`): exactly one of them keeps the rule going, and it is the intended one.
//   repeat  a repeating row (AB, ABC, AAB, ABB, AABB) with at least two full cycles plus one more shown
//   number  a number row with a constant step (+1, +2, +10, −1)
//   rotate  a dot moving round the corners of a diamond or square by a fixed step
//   grid    a 3×3 grid of an outer and an inner shape; each row and column has each outer and each inner shape once
// Vòng 1: repeat, blank at the end. Vòng 2: blank in the middle, number rows. Vòng 3: rotation and the grid.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

export type ShapeId = "circle" | "triangle" | "square";
export const SHAPES: ShapeId[] = ["circle", "triangle", "square"];
export const PATTERN_FRUITS = ["red_apple", "pear", "tangerine", "banana", "watermelon", "grapes", "strawberry"] as const;
export type Frame = "diamond" | "square";

export type Token =
  | { kind: "fruit"; fruit: string }
  /** `color` is 0–2; in the shape puzzles it changes together with the shape. */
  | { kind: "shape"; shape: ShapeId; color: 0 | 1 | 2 }
  | { kind: "num"; n: number }
  /** A dot on one corner (0–3, clockwise from the top / top-left) of a frame. */
  | { kind: "dot"; frame: Frame; corner: 0 | 1 | 2 | 3 }
  | { kind: "cell"; outer: ShapeId; inner: ShapeId };

export interface PatternQuestion {
  kind: "repeat" | "number" | "rotate" | "grid";
  /** The row (or the 3×3 grid, row by row); `null` is the blank. */
  items: (Token | null)[];
  /** Grid only. */
  cols?: number;
  /** Repeat only: how many pictures the unit has (AB = 2). */
  period?: number;
  options: Token[];
  /** Index into `options`. */
  answer: number;
}

/** Index of the tapped option. */
export type PatternAnswer = number;

export function tokenKey(t: Token): string {
  switch (t.kind) {
    case "fruit": return `fruit:${t.fruit}`;
    case "shape": return `shape:${t.shape}:${t.color}`;
    case "num": return `num:${t.n}`;
    case "dot": return `dot:${t.frame}:${t.corner}`;
    case "cell": return `cell:${t.outer}:${t.inner}`;
  }
}

/** Smallest p such that the row repeats with period p (the row's length if it never does). */
export function smallestPeriod(keys: readonly string[]): number {
  for (let p = 1; p < keys.length; p++) if (keys.every((k, j) => j + p >= keys.length || keys[j + p] === k)) return p;
  return keys.length;
}

const ALL_SAME = (xs: readonly number[]) => xs.every((x) => x === xs[0]);

/** Does putting `option` into the blank keep the rule of this puzzle going? */
export function fits(q: PatternQuestion, option: Token): boolean {
  const row = q.items.map((t) => t ?? option);
  switch (q.kind) {
    case "repeat":
      return smallestPeriod(row.map(tokenKey)) === q.period;
    case "number": {
      const n = row.map((t) => (t.kind === "num" ? t.n : NaN));
      return ALL_SAME(n.slice(1).map((x, i) => x - n[i]!));
    }
    case "rotate": {
      const c = row.map((t) => (t.kind === "dot" ? t.corner : NaN));
      const steps = c.slice(1).map((x, i) => (x - c[i]! + 4) % 4);
      return ALL_SAME(steps) && steps[0] !== 0;
    }
    case "grid": {
      const cols = q.cols ?? 3;
      const cells = row.map((t) => (t.kind === "cell" ? t : null));
      if (cells.some((c) => !c)) return false;
      const distinct = (ids: number[], pick: (c: { outer: ShapeId; inner: ShapeId }) => string) => new Set(ids.map((i) => pick(cells[i]!))).size === ids.length;
      for (let r = 0; r < cols; r++) {
        const rowIds = Array.from({ length: cols }, (_, c) => r * cols + c);
        const colIds = Array.from({ length: cols }, (_, c) => c * cols + r);
        for (const ids of [rowIds, colIds]) if (!distinct(ids, (c) => c.outer) || !distinct(ids, (c) => c.inner)) return false;
      }
      return true;
    }
  }
}

/** Indices of the options that fit. A good puzzle has exactly one, and it is `answer`. */
export function fittingOptions(q: PatternQuestion): number[] {
  return q.options.flatMap((o, i) => (fits(q, o) ? [i] : []));
}

// ---- building blocks ----

/** The correct token first, then `count - 1` different ones (the given distractors, then the extras), shuffled. */
function withOptions(correct: Token, distractors: Token[], count: number, rng: Rng): { options: Token[]; answer: number } {
  const seen = new Set([tokenKey(correct)]);
  const all: Token[] = [correct];
  for (const d of distractors) {
    if (all.length >= count) break;
    if (!seen.has(tokenKey(d))) { seen.add(tokenKey(d)); all.push(d); }
  }
  const options = rng.shuffle(all);
  return { options, answer: options.findIndex((o) => tokenKey(o) === tokenKey(correct)) };
}

type RepeatSet = "fruit" | "shape";

function repeatQuestion(rng: Rng, unit: string, set: RepeatSet, blank: "end" | "middle", optionCount: number): PatternQuestion {
  const letters = [...new Set(unit)];
  const period = unit.length;
  const n = 2 * period + 2;
  let map: Record<string, Token>;
  let extras: Token[];
  if (set === "fruit") {
    const fruits = rng.shuffle(PATTERN_FRUITS);
    map = Object.fromEntries(letters.map((l, i) => [l, { kind: "fruit", fruit: fruits[i]! } as Token]));
    extras = fruits.slice(letters.length).map((fruit) => ({ kind: "fruit", fruit }) as Token);
  } else {
    // shape and colour change together: each letter has its own shape AND its own colour
    const shapes = rng.shuffle(SHAPES);
    const colors = rng.shuffle([0, 1, 2] as const);
    map = Object.fromEntries(letters.map((l, i) => [l, { kind: "shape", shape: shapes[i]!, color: colors[i]! } as Token]));
    // mismatched pairs (right shape, wrong colour and the other way round) make the best distractors
    extras = letters.flatMap((l, i) => {
      const t = map[l] as Extract<Token, { kind: "shape" }>;
      const other = letters[(i + 1) % letters.length]!;
      const o = map[other] as Extract<Token, { kind: "shape" }>;
      return [{ kind: "shape", shape: t.shape, color: o.color } as Token, { kind: "shape", shape: o.shape, color: t.color } as Token];
    }).concat(shapes.slice(letters.length).map((shape, i) => ({ kind: "shape", shape, color: colors[letters.length + i]! }) as Token));
  }
  const seq = Array.from({ length: n }, (_, j) => map[unit[j % period]!]!);
  const blankAt = blank === "end" ? n - 1 : rng.int(period, n - 2);
  const correct = seq[blankAt]!;
  const others = letters.map((l) => map[l]!).filter((t) => tokenKey(t) !== tokenKey(correct));
  const { options, answer } = withOptions(correct, [...rng.shuffle(others), ...rng.shuffle(extras)], optionCount, rng);
  return { kind: "repeat", period, items: seq.map((t, j) => (j === blankAt ? null : t)), options, answer };
}

function numberQuestion(rng: Rng, d: number): PatternQuestion {
  const n = rng.int(5, 6);
  const span = Math.abs(d) * (n - 1);
  const start = d === 10 ? rng.pick([0, 10, 20]) : d > 0 ? rng.int(0, Math.min(20 - span, 10)) : rng.int(span, 20);
  const seq = Array.from({ length: n }, (_, i) => start + i * d);
  const blankAt = rng.int(2, n - 2);
  const correct: Token = { kind: "num", n: seq[blankAt]! };
  const c = seq[blankAt]!;
  const near = rng.shuffle([c + 1, c - 1, c + d, c - d, c + 2 * d, c - 2 * d, c + 2]).filter((x) => x >= 0 && x !== c);
  const { options, answer } = withOptions(correct, near.map((x) => ({ kind: "num", n: x }) as Token), 4, rng);
  return { kind: "number", items: seq.map((x, i) => (i === blankAt ? null : ({ kind: "num", n: x } as Token))), options, answer };
}

function rotateQuestion(rng: Rng, step: 1 | 2, blank: "end" | "middle"): PatternQuestion {
  const frame: Frame = rng.pick(["diamond", "square"] as const);
  const start = rng.int(0, 3);
  const n = 6;
  const dots = Array.from({ length: n }, (_, i) => ({ kind: "dot", frame, corner: ((start + i * step) % 4) as 0 | 1 | 2 | 3 }) as Token);
  const blankAt = blank === "end" ? n - 1 : rng.int(2, n - 2);
  const correct = dots[blankAt]!;
  const all = ([0, 1, 2, 3] as const).map((corner) => ({ kind: "dot", frame, corner }) as Token);
  const { options, answer } = withOptions(correct, all, 4, rng);
  return { kind: "rotate", items: dots.map((t, i) => (i === blankAt ? null : t)), options, answer };
}

function gridQuestion(rng: Rng): PatternQuestion {
  const latin = () => {
    const base = rng.shuffle(SHAPES);
    const shift = rng.pick([1, 2]);
    return (r: number, c: number) => base[(c + r * shift) % 3]!;
  };
  const outer = latin(), inner = latin();
  const cells: Token[] = Array.from({ length: 9 }, (_, i) => ({ kind: "cell", outer: outer(Math.floor(i / 3), i % 3), inner: inner(Math.floor(i / 3), i % 3) }));
  const blankAt = rng.int(0, 8);
  const right = cells[blankAt] as Extract<Token, { kind: "cell" }>;
  const [o1, o2] = rng.shuffle(SHAPES.filter((s) => s !== right.outer)) as [ShapeId, ShapeId];
  const [i1, i2] = rng.shuffle(SHAPES.filter((s) => s !== right.inner)) as [ShapeId, ShapeId];
  const distractors: Token[] = [
    { kind: "cell", outer: o1, inner: right.inner }, // outer shape repeats in its row or column
    { kind: "cell", outer: right.outer, inner: i1 }, // inner shape repeats
    { kind: "cell", outer: o2, inner: i2 },
  ];
  const { options, answer } = withOptions(right, distractors, 4, rng);
  return { kind: "grid", cols: 3, items: cells.map((t, i) => (i === blankAt ? null : t)), options, answer };
}

export const patternLogic: GameLogic<PatternQuestion, PatternAnswer> = {
  id: "pattern",

  generate(pos: Position, rng: Rng): PatternQuestion {
    const step = Math.min(pos.step, 2);
    for (let i = 0; i < 100; i++) {
      let q: PatternQuestion;
      if (pos.tier === 1) {
        q = step === 0 ? repeatQuestion(rng, "AB", "fruit", "end", 3)
          : step === 1 ? repeatQuestion(rng, rng.pick(["ABC", "AAB"]), "fruit", "end", 3)
          : repeatQuestion(rng, rng.pick(["AB", "ABB"]), "shape", "end", 4);
      } else if (pos.tier === 2) {
        q = step === 0 ? repeatQuestion(rng, rng.pick(["AB", "ABC", "AAB"]), rng.pick(["fruit", "shape"] as const), "middle", 4)
          : step === 1 ? numberQuestion(rng, rng.pick([1, 2]))
          : rng.chance(0.5) ? numberQuestion(rng, rng.pick([10, -1])) : repeatQuestion(rng, "AABB", "fruit", rng.pick(["end", "middle"] as const), 4);
      } else {
        q = step === 0 ? rotateQuestion(rng, 1, "end")
          : step === 1 ? (rng.chance(0.5) ? rotateQuestion(rng, 2, "end") : rotateQuestion(rng, 1, "middle"))
          : gridQuestion(rng);
      }
      const fit = fittingOptions(q);
      if (fit.length === 1 && fit[0] === q.answer) return q;
    }
    // always-valid fallback: apple, pear, apple, pear, apple, ?
    const apple: Token = { kind: "fruit", fruit: "red_apple" }, pear: Token = { kind: "fruit", fruit: "pear" }, grapes: Token = { kind: "fruit", fruit: "grapes" };
    return { kind: "repeat", period: 2, items: [apple, pear, apple, pear, apple, null], options: [pear, apple, grapes], answer: 0 };
  },

  check(q: PatternQuestion, a: PatternAnswer): CheckResult {
    if (typeof a !== "number" || !Number.isInteger(a) || a < 0 || a >= q.options.length) return { correct: false, reason: "empty" };
    return a === q.answer ? { correct: true, reason: "right" } : { correct: false, reason: "wrongPick", data: { picked: a } };
  },

  solve: (q) => q.answer,
};
