// Game 1 — Cái cân. Make both pans weigh the same by adding fruit from the tray.
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";
import type { Rng } from "../../core/rng.ts";

export type Fruit = "grapes" | "red_apple" | "watermelon";
export const WEIGHT: Record<Fruit, number> = { grapes: 1, red_apple: 2, watermelon: 3 };

export interface ScaleQuestion {
  /** Fruit already on the pans; the child cannot remove these. */
  left: Fruit[];
  right: Fruit[];
  /** Fruit the child can drag onto the pans. Always contains at least one solution. */
  tray: Fruit[];
  /** Kinds in play, for the weight key ("Bảng cân"). Empty in tier 1 (weights do not matter). */
  key: Fruit[];
  /** Tier 1: the beam tips while dragging. Tier 2+: a padlock holds it until "Xong". */
  liveTilt: boolean;
  /** Tier 1: show the count on each pan and the >, <, = sign. */
  showCounts: boolean;
}

/** What the child added (fruit moved from the tray to each pan). */
export interface ScaleAnswer {
  addedLeft: Fruit[];
  addedRight: Fruit[];
}

export const weightOf = (items: readonly Fruit[]) => items.reduce((s, f) => s + WEIGHT[f], 0);

/** Sign shown above the pivot in tier 1, comparing the pans' totals. */
export function compareSign(left: number, right: number): ">" | "<" | "=" {
  return left > right ? ">" : left < right ? "<" : "=";
}

/** Random fruit whose weights add up to exactly `total`, using only `kinds`. */
function fruitsWeighing(total: number, kinds: Fruit[], maxItems: number, rng: Rng): Fruit[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const out: Fruit[] = [];
    let left = total;
    while (left > 0 && out.length < maxItems) {
      const fits = kinds.filter((k) => WEIGHT[k] <= left);
      const f = rng.pick(fits);
      out.push(f);
      left -= WEIGHT[f];
    }
    if (left === 0) return out;
  }
  return Array<Fruit>(total).fill("grapes"); // grapes weigh 1: always works
}

// Per tier and hidden step: [min, max] pan weight and [min, max] difference to fix.
const T1 = [{ pan: [1, 5], diff: [1, 2] }, { pan: [2, 8], diff: [1, 3] }, { pan: [3, 10], diff: [2, 4] }];
const T2 = [{ pan: [2, 6], diff: [1, 2] }, { pan: [3, 8], diff: [1, 3] }, { pan: [4, 10], diff: [2, 4] }];
const T3 = [{ pan: [3, 9], diff: [1, 3] }, { pan: [4, 12], diff: [2, 4] }, { pan: [5, 14], diff: [2, 5] }];

export const scaleLogic: GameLogic<ScaleQuestion, ScaleAnswer> = {
  id: "scale",

  generate(pos: Position, rng: Rng): ScaleQuestion {
    const table = pos.tier === 1 ? T1 : pos.tier === 2 ? T2 : T3;
    const cfg = table[Math.min(pos.step, table.length - 1)]!;
    const kinds: Fruit[] = pos.tier === 1 ? ["red_apple"] : pos.tier === 2 ? ["grapes", "red_apple"] : ["grapes", "red_apple", "watermelon"];

    // Tier 1 uses one fruit only, so comparing weights is comparing counts.
    const diff = rng.int(cfg.diff[0]!, cfg.diff[1]!);
    const light = rng.int(cfg.pan[0]!, Math.max(cfg.pan[0]!, cfg.pan[1]! - diff));
    const heavy = light + diff;
    const lightPan = pos.tier === 1 ? Array<Fruit>(light).fill("red_apple") : fruitsWeighing(light, kinds, 4, rng);
    const heavyPan = pos.tier === 1 ? Array<Fruit>(heavy).fill("red_apple") : fruitsWeighing(heavy, kinds, 4, rng);
    const heavyLeft = rng.chance(0.5);

    // Tray: one exact solution plus distractors, shuffled.
    const solution = pos.tier === 1 ? Array<Fruit>(diff).fill("red_apple") : fruitsWeighing(diff, kinds, 6, rng);
    const extras: Fruit[] = pos.tier === 1
      ? Array<Fruit>(rng.int(1, 2)).fill("red_apple")
      : Array.from({ length: rng.int(2, 3) }, () => rng.pick(kinds));
    // Make sure enough grapes exist in tier 2+ so several answers are possible.
    if (pos.tier > 1) while (solution.concat(extras).filter((f) => f === "grapes").length < Math.min(diff, 3)) extras.push("grapes");

    return {
      left: heavyLeft ? heavyPan : lightPan,
      right: heavyLeft ? lightPan : heavyPan,
      tray: rng.shuffle([...solution, ...extras]),
      key: pos.tier === 1 ? [] : kinds,
      liveTilt: pos.tier === 1,
      showCounts: pos.tier === 1,
    };
  },

  check(q: ScaleQuestion, a: ScaleAnswer): CheckResult {
    if (!a || !Array.isArray(a.addedLeft) || !Array.isArray(a.addedRight)) return { correct: false, reason: "invalid" };
    // Only fruit that was really on the tray may be added.
    const pool = q.tray.slice();
    for (const f of [...a.addedLeft, ...a.addedRight]) {
      const i = pool.indexOf(f);
      if (i < 0) return { correct: false, reason: "invalid" };
      pool.splice(i, 1);
    }
    const L = weightOf(q.left) + weightOf(a.addedLeft);
    const R = weightOf(q.right) + weightOf(a.addedRight);
    if (L === R) return { correct: true, reason: "balanced", data: { left: L, right: R } };
    return { correct: false, reason: L > R ? "leftHeavier" : "rightHeavier", data: { left: L, right: R } };
  },

  solve(q: ScaleQuestion): ScaleAnswer {
    const L = weightOf(q.left), R = weightOf(q.right);
    const need = Math.abs(L - R);
    // Find a sub-multiset of the tray weighing `need` (tray is small: brute force).
    const n = q.tray.length;
    for (let mask = 1; mask < 1 << n; mask++) {
      const pick = q.tray.filter((_, i) => mask & (1 << i));
      if (weightOf(pick) === need) return L < R ? { addedLeft: pick, addedRight: [] } : { addedLeft: [], addedRight: pick };
    }
    return { addedLeft: [], addedRight: [] };
  },
};
