// Game 4 — Tính theo hình. Each fruit stands for a number. Children add known values
// (tier 1), then work backwards from clues (tiers 2–3).
//
// Generator rule (docs/RULES.md): clues are built so that at every step one clue has
// exactly ONE unknown fruit; the child solves it, substitutes, and moves on. Puzzles that
// need two clues solved together are never produced, and every puzzle has one solution.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

export type Fruit = "red_apple" | "pear" | "watermelon" | "tangerine";
export const FRUITS: Fruit[] = ["red_apple", "pear", "watermelon", "tangerine"];

export interface Clue {
  terms: Fruit[];
  total: number;
}

export interface EquationsQuestion {
  /** Values shown openly ("Bảng số"). */
  known: { fruit: Fruit; value: number }[];
  /** Clues, in the order a child can solve them. */
  clues: Clue[];
  /** The question row: the sum of these fruits = ? */
  ask: Fruit[];
  answer: number;
}

export type EquationsAnswer = number;

const sum = (terms: Fruit[], v: Partial<Record<Fruit, number>>) => terms.reduce((s, f) => s + (v[f] ?? NaN), 0);

/** Number of value assignments (0..maxV for every unknown fruit) that satisfy all clues. */
export function countSolutions(q: EquationsQuestion, maxV = 10): number {
  const knownV: Partial<Record<Fruit, number>> = {};
  for (const k of q.known) knownV[k.fruit] = k.value;
  const unknown = [...new Set(q.clues.flatMap((c) => c.terms).concat(q.ask))].filter((f) => !(f in knownV));
  let count = 0;
  let askValue: number | null = null;
  let askAmbiguous = false;
  const v: Partial<Record<Fruit, number>> = { ...knownV };
  const rec = (i: number) => {
    if (i === unknown.length) {
      if (q.clues.every((c) => sum(c.terms, v) === c.total)) {
        count++;
        const a = sum(q.ask, v);
        if (askValue === null) askValue = a; else if (a !== askValue) askAmbiguous = true;
      }
      return;
    }
    for (let x = 0; x <= maxV; x++) { v[unknown[i]!] = x; rec(i + 1); }
  };
  rec(0);
  return askAmbiguous ? Infinity : count;
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
  return q.ask.every((f) => solved.has(f));
}

function pickFruits(n: number, rng: Rng): Fruit[] {
  return rng.shuffle(FRUITS).slice(0, n);
}

// ---- tier 1: everything is known, just add ----
function tierOne(step: number, rng: Rng): EquationsQuestion {
  const maxV = [2, 4, 5][step]!;
  const nTerms = step === 2 && rng.chance(0.5) ? 3 : 2;
  const fruits = pickFruits(2, rng);
  const values = fruits.map(() => rng.int(1, maxV));
  const ask = Array.from({ length: nTerms }, (_, i) => fruits[i % 2 === 0 ? 0 : rng.int(0, 1)]!);
  const known = fruits.filter((f) => ask.includes(f)).map((f) => ({ fruit: f, value: values[fruits.indexOf(f)]! }));
  return { known, clues: [], ask, answer: sum(ask, Object.fromEntries(known.map((k) => [k.fruit, k.value]))) };
}

/** Build clues that introduce one new fruit each, in order. `fruits[i]` gets introduced by clue i. */
function chain(fruits: Fruit[], values: number[], rng: Rng, opts: { firstRepeat: number[] }): Clue[] {
  const v = Object.fromEntries(fruits.map((f, i) => [f, values[i]!])) as Record<Fruit, number>;
  return fruits.map((f, i) => {
    if (i === 0) {
      const reps = rng.pick(opts.firstRepeat);
      const terms = Array<Fruit>(reps).fill(f);
      return { terms, total: reps * v[f] };
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
    const known = fruits.map((f) => ({ fruit: f, value: rng.int(1, 3) }));
    return { known, clues: [], ask: fruits, answer: known.reduce((s, k) => s + k.value, 0) };
  }
  if (step === 0) {
    // 🍎 + 🍎 = 4 → 🍎 = ?
    const [f] = pickFruits(1, rng);
    const x = rng.int(1, 5);
    return { known: [], clues: [{ terms: [f!, f!], total: 2 * x }], ask: [f!], answer: x };
  }
  // Two fruits, two clues: 🍎 + 🍎 = 2, 🍎 + 🍐 = 3 → 🍐 = ?
  const fruits = pickFruits(2, rng);
  const values = fruits.map(() => rng.int(step === 2 ? 0 : 1, 5));
  const clues = chain(fruits, values, rng, { firstRepeat: [2, 3] });
  return { known: [], clues, ask: [fruits[1]!], answer: values[1]! };
}

function tierThree(step: number, rng: Rng): EquationsQuestion {
  const fruits = pickFruits(3, rng);
  const maxV = [5, 6, 7][step]!;
  const values = fruits.map(() => rng.int(step === 0 ? 1 : 0, maxV));
  const clues = chain(fruits, values, rng, { firstRepeat: [2, 3] });
  // Step 2 may ask for a sum of two fruits instead of one.
  const ask: Fruit[] = step === 2 && rng.chance(0.4) ? [fruits[1]!, fruits[2]!] : [fruits[2]!];
  const v = Object.fromEntries(fruits.map((f, i) => [f, values[i]!])) as Record<Fruit, number>;
  return { known: [], clues: rng.chance(0.3) ? rng.shuffle(clues) : clues, ask, answer: sum(ask, v) };
}

export const equationsLogic: GameLogic<EquationsQuestion, EquationsAnswer> = {
  id: "equations",

  generate(pos: Position, rng: Rng): EquationsQuestion {
    const make = () => (pos.tier === 1 ? tierOne(pos.step, rng) : pos.tier === 2 ? tierTwo(pos.step, rng) : tierThree(pos.step, rng));
    for (let i = 0; i < 200; i++) {
      const q = make();
      const totalsOk = q.clues.every((c) => c.total <= 20) && q.answer <= 20;
      if (totalsOk && isChainSolvable(q) && countSolutions(q) === 1) return q;
    }
    // Always-valid fallback.
    return { known: [{ fruit: "red_apple", value: 1 }], clues: [], ask: ["red_apple", "red_apple"], answer: 2 };
  },

  check(q: EquationsQuestion, a: EquationsAnswer): CheckResult {
    if (typeof a !== "number" || !Number.isFinite(a)) return { correct: false, reason: "empty" };
    return a === q.answer
      ? { correct: true, reason: "right" }
      : { correct: false, reason: q.clues.length ? "wrongChain" : "wrongSum", data: { given: a } };
  },

  solve: (q) => q.answer,
};
