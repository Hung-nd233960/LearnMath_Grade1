// Thăng bằng, Vòng 2: small scales compare pairs of same-sized gift boxes; the child
// reasons from the clues (A < B, B < C → C heaviest). Boxes look alike in size, so real-
// world knowledge cannot give the answer away.
//   step 0  3 boxes, the scales in chain order: tap the heaviest
//   step 1  4 boxes, sides flipped: tap the heaviest or the lightest
//   step 2  3–4 boxes, the scales shuffled too: put them in order
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, Position } from "../../core/types.ts";

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
  kind: "compare";
  /** Boxes as offered to the child to tap (display order). */
  items: Box[];
  weighings: Weighing[];
  mode: "heaviest" | "lightest" | "order";
  /** Lightest → heaviest. */
  truth: Box[];
}

export type CompareAnswer = Box | Box[];

export function generateCompare(pos: Position, rng: Rng): CompareQuestion {
  const step = Math.min(pos.step, 2);
  const n = step === 0 ? 3 : step === 1 ? 4 : rng.pick([3, 4]);
  const truth = rng.shuffle(Object.keys(BOXES) as Box[]).slice(0, n);
  // Neighbouring pairs in the true order give exactly enough clues.
  let weighings: Weighing[] = truth.slice(1).map((heavy, i) => ({ left: truth[i]!, right: heavy, heavier: "right" as const }));
  // Step 0 shows the scales in chain order with the heavier box always on the right; later steps flip sides,
  // and step 2 also shuffles the order of the scales.
  if (step >= 1) weighings = weighings.map((w) => (rng.chance(0.5) ? { left: w.right, right: w.left, heavier: "left" as const } : w));
  if (step === 2) weighings = rng.shuffle(weighings);
  const mode: CompareQuestion["mode"] = step === 0 ? "heaviest" : step === 1 ? rng.pick(["heaviest", "lightest"] as const) : "order";
  return { kind: "compare", items: rng.shuffle(truth), weighings, mode, truth };
}

export function checkCompare(q: CompareQuestion, a: CompareAnswer): CheckResult {
  if (q.mode === "order") {
    if (!Array.isArray(a) || a.length !== q.truth.length) return { correct: false, reason: "incomplete" };
    const ok = a.every((b, i) => b === q.truth[i]);
    return ok ? { correct: true, reason: "right" } : { correct: false, reason: "wrongOrder", data: { firstWrong: a.findIndex((b, i) => b !== q.truth[i]) } };
  }
  const want = q.mode === "heaviest" ? q.truth[q.truth.length - 1] : q.truth[0];
  return a === want ? { correct: true, reason: "right" } : { correct: false, reason: "wrongPick", data: { picked: a } };
}

export function solveCompare(q: CompareQuestion): CompareAnswer {
  if (q.mode === "order") return q.truth.slice();
  return q.mode === "heaviest" ? q.truth[q.truth.length - 1]! : q.truth[0]!;
}
