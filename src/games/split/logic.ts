// Game 5 — Mấy và mấy. A whole splits into two parts (7 = 3 + 4). Tier 1 counts a picture,
// tier 2 adds the number bond, tier 3 is the number bond alone with a missing part.
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

export type Slot = "whole" | "a" | "b";

/** Picture sets: two kinds that differ by SHAPE as well as colour (colour-blind friendly). */
export const SCENES = {
  vase: { container: "vase", kinds: ["tulip", "sunflower"], names: ["hoa đỏ", "hoa vàng"], unit: "bông hoa" },
  basket: { container: "basket", kinds: ["tangerine", "red_apple"], names: ["quả cam", "quả táo"], unit: "quả" },
} as const;
export type SceneId = keyof typeof SCENES;

export interface SplitQuestion {
  /** "picture": tier 1; "picture+bond": tier 2; "bond": tier 3. */
  mode: "picture" | "picture+bond" | "bond";
  scene: SceneId;
  whole: number;
  a: number;
  b: number;
  /** Which numbers the child fills in; the others are shown. */
  blanks: Slot[];
  /** Picture modes: the order the items are drawn in (kind index 0 = a, 1 = b), mixed. */
  layout: (0 | 1)[];
}

export type SplitAnswer = Partial<Record<Slot, number>>;

const T1 = [5, 7, 10];
const T2 = [6, 8, 10];
const T3 = [10, 15, 20];

function parts(whole: number, allowZero: boolean, rng: Rng): [number, number] {
  const a = allowZero ? rng.int(0, whole) : rng.int(1, whole - 1);
  return [a, whole - a];
}

export const splitLogic: GameLogic<SplitQuestion, SplitAnswer> = {
  id: "split",

  generate(pos: Position, rng: Rng): SplitQuestion {
    const step = Math.min(pos.step, 2);
    const scene: SceneId = rng.chance(0.7) ? "vase" : "basket";
    let whole: number, a: number, b: number, blanks: Slot[];
    if (pos.tier === 1) {
      whole = rng.int(3, T1[step]!);
      [a, b] = parts(whole, false, rng);
      blanks = ["whole"];
    } else if (pos.tier === 2) {
      whole = rng.int(3, T2[step]!);
      [a, b] = parts(whole, step > 0, rng); // 0 can appear from step 1
      blanks = ["a", "b"];
    } else {
      whole = rng.int(step === 0 ? 5 : 8, T3[step]!);
      [a, b] = parts(whole, step > 0, rng);
      blanks = [rng.chance(0.5) ? "a" : "b"];
    }
    const layout = rng.shuffle([...Array<0>(a).fill(0), ...Array<1>(b).fill(1)]);
    return { mode: pos.tier === 1 ? "picture" : pos.tier === 2 ? "picture+bond" : "bond", scene, whole, a, b, blanks, layout };
  },

  check(q: SplitQuestion, ans: SplitAnswer): CheckResult {
    if (!ans || typeof ans !== "object") return { correct: false, reason: "empty" };
    const missing = q.blanks.filter((s) => typeof ans[s] !== "number");
    if (missing.length) return { correct: false, reason: "empty", data: { missing } };
    const wrong = q.blanks.filter((s) => ans[s] !== q[s]);
    if (!wrong.length) return { correct: true, reason: "right" };
    // A sum that is right but swapped (e.g. 2 red / 4 yellow instead of 4 / 2) gets its own hint.
    const swapped = q.blanks.length === 2 && ans.a === q.b && ans.b === q.a;
    return { correct: false, reason: swapped ? "swapped" : q.mode === "picture" ? "miscount" : "badSum", data: { wrong } };
  },

  solve: (q) => Object.fromEntries(q.blanks.map((s) => [s, q[s]])),
};
