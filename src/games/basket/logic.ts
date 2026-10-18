// Game 3 — Chia quả (was Giỏ trái cây). Fruit moves from the child's basket to Mèo's basket, in three ways:
//   give      Mèo asks for an exact amount ("Đưa cho Mèo hai chục quả cam")                      Vòng 1–2, and Vòng 3 step 0
//   addTo     Mèo already has some and wants a total: how many more? (5 → 15: "đưa thêm 10")        Vòng 3 step 1
//   equalize  the baskets hold different amounts: move fruit until both are the same               Vòng 3 step 2
// Bags of 10 (a chục) appear when 10 or more is needed. The child's basket always holds 2–9 loose fruit of a kind.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

export type Fruit = "tangerine" | "red_apple" | "banana";
export const FRUITS: Fruit[] = ["tangerine", "red_apple", "banana"];

/** How a tier-2 amount is phrased: "hai chục", "mười", or "mười ba". */
export type TensKind = "wholeTens" | "plainTen" | "tensOnes";

export interface BasketQuestion {
  mode: "give" | "addTo" | "equalize";
  /** What Mèo asks for, by kind. A kind with 0 is a trick question ("không quả chuối"). */
  want: Partial<Record<Fruit, number>>;
  /** Order the kinds are spoken in. */
  order: Fruit[];
  /** The child's basket at the start: loose fruit and bags of 10 (bags are always tangerines). */
  loose: Partial<Record<Fruit, number>>;
  bags: number;
  /** Tier 2 only: how the amount is phrased, to teach "chục". */
  tens: { kind: TensKind; tens: number; ones: number } | null;
  /** Live counts on the baskets (tier 1 only — later the child must count). */
  showCounts: boolean;
  /** addTo and equalize: how many of `order[0]` are already in Mèo's basket (fixed: the child cannot take them out). */
  start?: number;
  /** addTo: the total Mèo wants (start + want[kind]). */
  target?: number;
}

/** What is in Mèo's basket when the child presses "Xong". */
export interface BasketAnswer {
  /** What the child moved INTO Mèo's basket (not counting what Mèo started with). */
  loose: Partial<Record<Fruit, number>>;
  bags: number;
  /** addTo: the number the child typed for "Em đã đưa thêm ☐ quả". */
  said?: number;
}

export const BAG_SIZE = 10;

/**
 * The child's basket always holds between MIN_LOOSE and MAX_LOOSE single fruit of a kind, never ten or more:
 * a child who wants ten must reach for a bag (a chục), not count out ten loose ones.
 */
export const MIN_LOOSE = 2;
export const MAX_LOOSE = 9;

export function totalOf(a: BasketAnswer, kind: Fruit): number {
  return (a.loose[kind] ?? 0) + (kind === "tangerine" ? a.bags * BAG_SIZE : 0);
}

const T1 = [[1, 3, 5], [2, 5, 7], [3, 8, 9]] as const; // [min want, max want, fruit in basket]: always fewer than ten, with at least one spare

function tierTwo(step: number, rng: Rng): BasketQuestion {
  // The bank deliberately leans on whole tens so children meet "chục" again and again.
  const kinds: TensKind[] = step === 0
    ? ["wholeTens", "wholeTens", "plainTen", "tensOnes"]
    : step === 1 ? ["wholeTens", "plainTen", "tensOnes", "tensOnes"] : ["wholeTens", "tensOnes", "tensOnes", "tensOnes"];
  const kind = rng.pick(kinds);
  const tens = kind === "wholeTens" ? rng.int(1, 2) : 1;
  const ones = kind === "tensOnes" ? rng.int(1, step === 2 ? 9 : 6) : 0;
  return {
    mode: "give",
    want: { tangerine: tens * BAG_SIZE + ones },
    order: ["tangerine"],
    loose: { tangerine: rng.int(Math.max(MIN_LOOSE, ones), MAX_LOOSE) }, // always fewer than 10, and enough for the "ones"
    bags: 2,
    tens: { kind, tens, ones },
    showCounts: false,
  };
}

/** Vòng 3, step 0: several kinds at once, or "không quả chuối" (an empty basket is right). */
function severalKinds(rng: Rng): BasketQuestion {
  const loose: Partial<Record<Fruit, number>> = {};
  for (const f of FRUITS) loose[f] = rng.int(3, 6);
  if (rng.chance(0.25)) {
    const f = rng.pick(FRUITS);
    return { mode: "give", want: { [f]: 0 }, order: [f], loose, bags: 0, tens: null, showCounts: false };
  }
  const [a, b] = rng.shuffle(FRUITS);
  const max = 4;
  const want = { [a!]: rng.int(1, Math.min(max, loose[a!]!)), [b!]: rng.int(1, Math.min(max, loose[b!]!)) } as Partial<Record<Fruit, number>>;
  return { mode: "give", want, order: [a!, b!], loose, bags: 0, tens: null, showCounts: false };
}

/**
 * Vòng 3, step 1: "Trong giỏ của Mèo có 5 quả táo. Mèo muốn có tất cả 15 quả táo. Em đã đưa thêm mấy quả?"
 * Needing ten or more means a bag (a chục), so those are tangerines; the rest are any fruit.
 */
function addTo(rng: Rng): BasketQuestion {
  if (rng.chance(0.4)) {
    const need = rng.int(10, 15);
    const start = rng.int(1, Math.min(9, 20 - need));
    return {
      mode: "addTo", want: { tangerine: need }, order: ["tangerine"],
      loose: { tangerine: rng.int(Math.max(MIN_LOOSE, need - BAG_SIZE), MAX_LOOSE) }, bags: 2,
      tens: null, showCounts: false, start, target: start + need,
    };
  }
  const f = rng.pick(FRUITS);
  const need = rng.int(2, 8);
  const start = rng.int(1, 8);
  return {
    mode: "addTo", want: { [f]: need }, order: [f], loose: { [f]: rng.int(need + 1, MAX_LOOSE) }, bags: 0,
    tens: null, showCounts: false, start, target: start + need,
  };
}

/** Vòng 3, step 2: the child has c, Mèo has m (c − m is even): move fruit until both baskets hold the same. */
function equalize(rng: Rng): BasketQuestion {
  const f = rng.pick(FRUITS);
  const start = rng.int(0, 4);
  // the child holds start + 2 × moves: at least four, and never ten or more loose
  const moves = rng.int(Math.max(1, Math.ceil((4 - start) / 2)), Math.floor((MAX_LOOSE - start) / 2));
  return { mode: "equalize", want: { [f]: moves }, order: [f], loose: { [f]: start + 2 * moves }, bags: 0, tens: null, showCounts: false, start };
}

export const basketLogic: GameLogic<BasketQuestion, BasketAnswer> = {
  id: "basket",

  generate(pos: Position, rng: Rng): BasketQuestion {
    if (pos.tier === 2) return tierTwo(pos.step, rng);
    if (pos.tier === 3) return pos.step === 0 ? severalKinds(rng) : pos.step === 1 ? addTo(rng) : equalize(rng);
    const [lo, hi, stock] = T1[Math.min(pos.step, 2)]!;
    const f = rng.pick(FRUITS);
    return { mode: "give", want: { [f]: rng.int(lo, hi) }, order: [f], loose: { [f]: stock }, bags: 0, tens: null, showCounts: true };
  },

  check(q: BasketQuestion, a: BasketAnswer): CheckResult {
    if (!a || typeof a !== "object" || !a.loose) return { correct: false, reason: "invalid" };
    if (q.mode === "addTo") return checkAddTo(q, a);
    if (q.mode === "equalize") return checkEqualize(q, a);
    for (const f of FRUITS) {
      const have = totalOf(a, f), need = q.want[f] ?? 0;
      if (have !== need) return { correct: false, reason: have > need ? "tooMany" : "tooFew", data: { kind: f, have, need } };
    }
    // Tier 2: correct, but did the child build a ten from loose fruit instead of using a bag?
    const usedLooseForTen = !!q.tens && a.bags < q.tens.tens;
    return { correct: true, reason: usedLooseForTen ? "looseTen" : "exact", data: { usedLooseForTen } };
  },

  solve(q: BasketQuestion): BasketAnswer {
    const loose: Partial<Record<Fruit, number>> = {};
    let bags = 0;
    for (const f of q.order) {
      let n = q.want[f] ?? 0;
      if (f === "tangerine") { bags = Math.min(q.bags, Math.floor(n / BAG_SIZE)); n -= bags * BAG_SIZE; }
      loose[f] = n;
    }
    // addTo: the child also says how many they added; equalize: `want` already holds the number to move
    return q.mode === "addTo" ? { loose, bags, said: q.want[q.order[0]!] } : { loose, bags };
  },
};

/** addTo: Mèo's basket must end at the target, and the child must say how many they added. */
function checkAddTo(q: BasketQuestion, a: BasketAnswer): CheckResult {
  const kind = q.order[0]!, need = q.want[kind]!;
  const moved = totalOf(a, kind);
  const have = (q.start ?? 0) + moved;
  if (FRUITS.some((f) => f !== kind && (a.loose[f] ?? 0) > 0)) return { correct: false, reason: "invalid" };
  if (have !== q.target) return { correct: false, reason: have > q.target! ? "tooMany" : "tooFew", data: { kind, have, need: q.target } };
  if (typeof a.said !== "number" || !Number.isFinite(a.said)) return { correct: false, reason: "empty" };
  if (a.said !== need) return { correct: false, reason: "wrongSaid", data: { said: a.said, need } };
  return { correct: true, reason: "exact", data: { usedLooseForTen: false } };
}

/** equalize: only the end state counts — both baskets hold the same, however the fruit got there. */
function checkEqualize(q: BasketQuestion, a: BasketAnswer): CheckResult {
  const kind = q.order[0]!;
  const mine = (q.loose[kind] ?? 0) - totalOf(a, kind);
  const meo = (q.start ?? 0) + totalOf(a, kind);
  if (mine < 0) return { correct: false, reason: "invalid" };
  if (mine === meo) return { correct: true, reason: "equal", data: { mine, meo } };
  return { correct: false, reason: mine > meo ? "childMore" : "meoMore", data: { mine, meo } };
}
