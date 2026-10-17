// Game 3 — Giỏ trái cây. Mèo asks for an exact amount; the child moves fruit (and bags of 10)
// from their basket to Mèo's basket.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

export type Fruit = "tangerine" | "red_apple" | "banana";
export const FRUITS: Fruit[] = ["tangerine", "red_apple", "banana"];

/** How a tier-2 amount is phrased: "hai chục", "mười", or "mười ba". */
export type TensKind = "wholeTens" | "plainTen" | "tensOnes";

export interface BasketQuestion {
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
}

/** What is in Mèo's basket when the child presses "Xong". */
export interface BasketAnswer {
  loose: Partial<Record<Fruit, number>>;
  bags: number;
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
    want: { tangerine: tens * BAG_SIZE + ones },
    order: ["tangerine"],
    loose: { tangerine: rng.int(Math.max(MIN_LOOSE, ones), MAX_LOOSE) }, // always fewer than 10, and enough for the "ones"
    bags: 2,
    tens: { kind, tens, ones },
    showCounts: false,
  };
}

function tierThree(step: number, rng: Rng): BasketQuestion {
  const loose: Partial<Record<Fruit, number>> = {};
  for (const f of FRUITS) loose[f] = rng.int(3, 6);
  if (step === 2 && rng.chance(0.3)) {
    const f = rng.pick(FRUITS);
    return { want: { [f]: 0 }, order: [f], loose, bags: 0, tens: null, showCounts: false };
  }
  const [a, b] = rng.shuffle(FRUITS);
  const max = step === 0 ? 3 : 5;
  const want = { [a!]: rng.int(1, Math.min(max, loose[a!]!)), [b!]: rng.int(1, Math.min(max, loose[b!]!)) } as Partial<Record<Fruit, number>>;
  return { want, order: [a!, b!], loose, bags: 0, tens: null, showCounts: false };
}

export const basketLogic: GameLogic<BasketQuestion, BasketAnswer> = {
  id: "basket",

  generate(pos: Position, rng: Rng): BasketQuestion {
    if (pos.tier === 2) return tierTwo(pos.step, rng);
    if (pos.tier === 3) return tierThree(pos.step, rng);
    const [lo, hi, stock] = T1[Math.min(pos.step, 2)]!;
    const f = rng.pick(FRUITS);
    return { want: { [f]: rng.int(lo, hi) }, order: [f], loose: { [f]: stock }, bags: 0, tens: null, showCounts: true };
  },

  check(q: BasketQuestion, a: BasketAnswer): CheckResult {
    if (!a || typeof a !== "object" || !a.loose) return { correct: false, reason: "invalid" };
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
    return { loose, bags };
  },
};
