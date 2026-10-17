// Game 6 — So sánh cân. Small scales compare pairs of same-sized gift boxes; the child
// reasons from the clues (A < B, B < C → C heaviest). Boxes look alike in size, so real-
// world knowledge cannot give the answer away.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

/** One gift picture, recoloured with a hue rotation. */
export const BOXES = {
  y: { hue: 0, name: "hộp vàng" },
  b: { hue: 200, name: "hộp tím" },
  g: { hue: 110, name: "hộp xanh lá" },
  p: { hue: 300, name: "hộp hồng" },
} as const;
export type Box = keyof typeof BOXES;

export interface Weighing {
  left: Box;
  right: Box;
  heavier: "left" | "right";
}

export interface CompareQuestion {
  /** Boxes as offered to the child to tap (display order). */
  items: Box[];
  weighings: Weighing[];
  mode: "heaviest" | "lightest" | "order";
  /** Lightest → heaviest. */
  truth: Box[];
}

export type CompareAnswer = Box | Box[];

export const compareLogic: GameLogic<CompareQuestion, CompareAnswer> = {
  id: "compare",

  generate(pos: Position, rng: Rng): CompareQuestion {
    const step = Math.min(pos.step, 2);
    const n = pos.tier === 1 ? 3 : 4;
    const truth = rng.shuffle(Object.keys(BOXES) as Box[]).slice(0, n);
    // Neighbouring pairs in the true order give exactly enough clues.
    let weighings: Weighing[] = truth.slice(1).map((heavy, i) => ({ left: truth[i]!, right: heavy, heavier: "right" as const }));
    // Tier 1 shows the scales in chain order with the heavier box always on the right.
    // Tier 2 shuffles which side is heavier; tier 3 also shuffles the order of the scales.
    if (pos.tier >= 2) {
      weighings = weighings.map((w) => (rng.chance(0.5) ? { left: w.right, right: w.left, heavier: "left" as const } : w));
    }
    if (pos.tier === 3 || (pos.tier === 2 && step === 2)) weighings = rng.shuffle(weighings);
    let mode: CompareQuestion["mode"];
    if (pos.tier === 1) mode = step === 2 && rng.chance(0.5) ? "lightest" : "heaviest";
    else if (pos.tier === 2) mode = step === 0 ? "order" : rng.pick(["order", "heaviest", "lightest"] as const);
    else mode = rng.pick(["order", "heaviest", "lightest"] as const);
    return { items: rng.shuffle(truth), weighings, mode, truth };
  },

  check(q: CompareQuestion, a: CompareAnswer): CheckResult {
    if (q.mode === "order") {
      if (!Array.isArray(a) || a.length !== q.truth.length) return { correct: false, reason: "incomplete" };
      const ok = a.every((b, i) => b === q.truth[i]);
      return ok ? { correct: true, reason: "right" } : { correct: false, reason: "wrongOrder", data: { firstWrong: a.findIndex((b, i) => b !== q.truth[i]) } };
    }
    const want = q.mode === "heaviest" ? q.truth[q.truth.length - 1] : q.truth[0];
    return a === want ? { correct: true, reason: "right" } : { correct: false, reason: "wrongPick", data: { picked: a } };
  },

  solve(q: CompareQuestion): CompareAnswer {
    if (q.mode === "order") return q.truth.slice();
    return q.mode === "heaviest" ? q.truth[q.truth.length - 1]! : q.truth[0]!;
  },
};
