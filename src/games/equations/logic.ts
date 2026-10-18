// Game 4 — Giải mã hình. Each fruit stands for a number. Children add known values
// (tier 1: several rows at once), then work backwards from clues (tiers 2–3).
//
// Generator rules (docs/RULES.md): clues are built so that at every step one clue has
// exactly ONE unknown fruit; the child solves it, substitutes, and moves on. Puzzles that
// need two clues solved together are never produced, and every puzzle has one solution.
// No two fruits in a puzzle share a value.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

export type Fruit = "red_apple" | "pear" | "watermelon" | "tangerine" | "banana";
export const FRUITS: Fruit[] = ["red_apple", "pear", "watermelon", "tangerine", "banana"];

export interface Clue {
  terms: Fruit[];
  total: number;
}

/** One line the child fills in: the sum of these fruits = ? */
export interface AskRow {
  terms: Fruit[];
  answer: number;
}

export interface EquationsQuestion {
  /** Values shown openly ("Bảng số"). */
  known: { fruit: Fruit; value: number }[];
  /** Clues, in the order a child can solve them. */
  clues: Clue[];
  /** The rows to fill in. Tier 1 has several; tiers 2–3 have one. */
  asks: AskRow[];
  /** The true value of every fruit in the puzzle (never shown; used to keep values distinct). */
  values: Partial<Record<Fruit, number>>;
}

/** One entry per row; null while a row is blank. */
export type EquationsAnswer = (number | null)[];

type Values = Partial<Record<Fruit, number>>;
const sum = (terms: Fruit[], v: Values) => terms.reduce((s, f) => s + (v[f] ?? NaN), 0);

/** Number of value assignments (0..maxV for every unknown fruit) that satisfy all clues (Infinity if a row's sum is ambiguous). */
export function countSolutions(q: EquationsQuestion, maxV = 10): number {
  const knownV: Values = {};
  for (const k of q.known) knownV[k.fruit] = k.value;
  const unknown = [...new Set(q.clues.flatMap((c) => c.terms).concat(q.asks.flatMap((a) => a.terms)))].filter((f) => !(f in knownV));
  let count = 0;
  let first: number[] | null = null;
  let ambiguous = false;
  const v: Values = { ...knownV };
  const rec = (i: number) => {
    if (i === unknown.length) {
      if (q.clues.every((c) => sum(c.terms, v) === c.total)) {
        count++;
        const sums = q.asks.map((a) => sum(a.terms, v));
        if (!first) first = sums; else if (sums.some((s, k) => s !== first![k])) ambiguous = true;
      }
      return;
    }
    for (let x = 0; x <= maxV; x++) { v[unknown[i]!] = x; rec(i + 1); }
  };
  rec(0);
  return ambiguous ? Infinity : count;
}

/** True if the clues can be solved one at a time, each clue having a single new unknown. */
export function isChainSolvable(q: EquationsQuestion): boolean {
  const solved = new Set(q.known.map((k) => k.fruit));
  const remaining = q.clues.slice();
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < remaining.length; i++) {
      const unknowns = new Set(remaining[i]!.terms.filter((f) => !solved.has(f)));
      if (unknowns.size <= 1) { unknowns.forEach((f) => solved.add(f)); remaining.splice(i, 1); progress = true; break; }
    }
  }
  return q.asks.every((a) => a.terms.every((f) => solved.has(f)));
}

const termsKey = (terms: readonly Fruit[]) => [...terms].sort().join(",");

/** True if a row asks exactly what one clue already states (the child could just copy the number). */
export function questionRepeatsClue(q: EquationsQuestion): boolean {
  return q.asks.some((a) => q.clues.some((c) => termsKey(c.terms) === termsKey(a.terms)));
}

/** True if no two fruits of the puzzle share a value. */
export function distinctValues(q: EquationsQuestion): boolean {
  const vals = Object.values(q.values);
  return new Set(vals).size === vals.length;
}

/** True if no two rows ask for the same set of fruit. */
export function rowsAreUnique(q: EquationsQuestion): boolean {
  return new Set(q.asks.map((a) => termsKey(a.terms))).size === q.asks.length;
}

function pickFruits(n: number, rng: Rng): Fruit[] {
  return rng.shuffle(FRUITS).slice(0, n);
}

/** `n` different values from lo..hi. */
function distinct(n: number, lo: number, hi: number, rng: Rng): number[] {
  const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return rng.shuffle(pool).slice(0, n);
}

const row = (terms: Fruit[], v: Values): AskRow => ({ terms, answer: sum(terms, v) });

/** All fruit multisets of the given length over `fruits`, as sorted-by-index arrays. */
function multisets(fruits: Fruit[], len: number): Fruit[][] {
  const out: Fruit[][] = [];
  const rec = (start: number, cur: Fruit[]) => {
    if (cur.length === len) { out.push(cur.slice()); return; }
    for (let i = start; i < fruits.length; i++) { cur.push(fruits[i]!); rec(i, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}

// ---- tier 1: every value is known, several rows to add (forward only) ----
function tierOne(step: number, rng: Rng): EquationsQuestion {
  const nFruits = step === 0 ? 2 : 3;
  const fruits = pickFruits(nFruits, rng);
  // step 0 uses 1..5; later steps let one fruit be worth 0 (like the "chuối = 0" of the teachers' example)
  const nums = step === 0 ? distinct(nFruits, 1, 5, rng) : distinct(nFruits, 0, 5, rng);
  const v: Values = Object.fromEntries(fruits.map((f, i) => [f, nums[i]!]));
  // Row shapes: [number of terms per row]
  const shape = step === 0 ? [2, 2] : step === 1 ? [3, 2] : [2, 2, 3];
  const used = new Set<string>();
  const asks: AskRow[] = [];
  for (const len of rng.shuffle(shape)) {
    const options = multisets(fruits, len).filter((t) => !used.has(termsKey(t)));
    const terms = rng.shuffle(rng.pick(options));
    used.add(termsKey(terms));
    asks.push(row(terms, v));
  }
  return { known: fruits.map((f) => ({ fruit: f, value: v[f]! })), clues: [], asks, values: v };
}

/** Build clues that introduce one new fruit each, in order. `fruits[i]` gets introduced by clue i. */
function chain(fruits: Fruit[], v: Values, rng: Rng, opts: { firstRepeat: number[] }): Clue[] {
  return fruits.map((f, i) => {
    if (i === 0) {
      const reps = rng.pick(opts.firstRepeat);
      const terms = Array<Fruit>(reps).fill(f);
      return { terms, total: reps * v[f]! };
    }
    const helpers = fruits.slice(0, i);
    const terms: Fruit[] = [rng.pick(helpers), f];
    if (i === 2 && rng.chance(0.5)) terms.unshift(rng.pick(helpers));
    const ordered = rng.shuffle(terms);
    return { terms: ordered, total: sum(ordered, v) };
  });
}

function tierTwo(step: number, rng: Rng): EquationsQuestion {
  if (step === 0 && rng.chance(0.5)) {
    // Longer sum, all values known: 🍎 + 🍐 + 🍉 = ?
    const fruits = pickFruits(3, rng);
    const nums = distinct(3, 1, 4, rng);
    const v: Values = Object.fromEntries(fruits.map((f, i) => [f, nums[i]!]));
    return { known: fruits.map((f) => ({ fruit: f, value: v[f]! })), clues: [], asks: [row(fruits, v)], values: v };
  }
  if (step === 0) {
    // 🍎 + 🍎 = 4 → 🍎 = ?
    const [f] = pickFruits(1, rng);
    const x = rng.int(1, 5);
    const v: Values = { [f!]: x };
    return { known: [], clues: [{ terms: [f!, f!], total: 2 * x }], asks: [row([f!], v)], values: v };
  }
  // Two fruits, two clues: 🍎 + 🍎 = 2, 🍎 + 🍐 = 3 → 🍐 = ?
  const fruits = pickFruits(2, rng);
  const nums = distinct(2, step === 2 ? 0 : 1, 5, rng);
  const v: Values = Object.fromEntries(fruits.map((f, i) => [f, nums[i]!]));
  const clues = chain(fruits, v, rng, { firstRepeat: [2, 3] });
  return { known: [], clues, asks: [row([fruits[1]!], v)], values: v };
}

function tierThree(step: number, rng: Rng): EquationsQuestion {
  const fruits = pickFruits(3, rng);
  const maxV = [5, 6, 7][step]!;
  const nums = distinct(3, step === 0 ? 1 : 0, maxV, rng);
  const v: Values = Object.fromEntries(fruits.map((f, i) => [f, nums[i]!]));
  const clues = chain(fruits, v, rng, { firstRepeat: [2, 3] });
  // Step 2 may ask for a sum of two fruits instead of one.
  const ask: Fruit[] = step === 2 && rng.chance(0.4) ? [fruits[1]!, fruits[2]!] : [fruits[2]!];
  return { known: [], clues: rng.chance(0.3) ? rng.shuffle(clues) : clues, asks: [row(ask, v)], values: v };
}

export const equationsLogic: GameLogic<EquationsQuestion, EquationsAnswer> = {
  id: "equations",

  generate(pos: Position, rng: Rng): EquationsQuestion {
    const make = () => (pos.tier === 1 ? tierOne(pos.step, rng) : pos.tier === 2 ? tierTwo(pos.step, rng) : tierThree(pos.step, rng));
    for (let i = 0; i < 200; i++) {
      const q = make();
      const limit = pos.tier === 1 ? 10 : 20; // October: tier 1 sums stay within 10
      const totalsOk = q.clues.every((c) => c.total <= 20) && q.asks.every((a) => a.answer <= limit);
      const coverage = pos.tier !== 1 || q.known.every((k) => q.asks.some((a) => a.terms.includes(k.fruit)));
      if (totalsOk && coverage && distinctValues(q) && rowsAreUnique(q) && !questionRepeatsClue(q) && isChainSolvable(q) && countSolutions(q) === 1) return q;
    }
    // Always-valid fallback.
    const v: Values = { red_apple: 1, pear: 2 };
    return {
      known: [{ fruit: "red_apple", value: 1 }, { fruit: "pear", value: 2 }],
      clues: [],
      asks: [row(["red_apple", "red_apple"], v), row(["red_apple", "pear"], v)],
      values: v,
    };
  },

  check(q: EquationsQuestion, a: EquationsAnswer): CheckResult {
    if (!Array.isArray(a) || a.length !== q.asks.length) return { correct: false, reason: "empty" };
    const blank = a.flatMap((x, i) => (typeof x !== "number" || !Number.isFinite(x) ? [i] : []));
    if (blank.length) return { correct: false, reason: "empty", data: { missing: blank } };
    const wrongRows = q.asks.flatMap((r, i) => (a[i] !== r.answer ? [i] : []));
    if (!wrongRows.length) return { correct: true, reason: "right" };
    return { correct: false, reason: q.clues.length ? "wrongChain" : "wrongSum", data: { wrongRows } };
  },

  solve: (q) => q.asks.map((r) => r.answer),
};
