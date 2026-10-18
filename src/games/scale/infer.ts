// Thăng bằng, Vòng 3: inference. Clue scales are balanced ("1 xoài = 3 cam"); the child works out what the
// question scale needs on its empty pan and puts that many cam there. The weights are never shown.
//   step 0  one kind asked (2 of it); the other clue is not needed
//   step 1  a mix of two kinds (2 xoài + 1 táo), using both clues
//   step 2  two chains: 1 dưa hấu = 2 táo, 1 táo = 2 cam, so 1 dưa hấu = ? cam
// Every value is a whole number of cam and every answer is at most 10 (the October rule).
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, Position } from "../../core/types.ts";

export type InferKind = "mango" | "red_apple" | "watermelon";
export const INFER_KINDS: InferKind[] = ["mango", "red_apple", "watermelon"];
/** The unit: one tangerine (cam) weighs 1. */
export const UNIT = "tangerine";
export type InferItem = InferKind | typeof UNIT;

/** A balanced clue scale. */
export interface InferClue {
  left: InferItem[];
  right: InferItem[];
}

export interface InferQuestion {
  kind: "infer";
  /** The clue scales, in reading order. */
  clues: InferClue[];
  /** What sits on the left pan of the question scale. */
  asked: InferItem[];
  /** Cam on the tray: the answer plus a few spare. */
  tray: number;
  /** Each kind's weight in cam. Never shown to the child (the tipping beam after "Xong" uses it). */
  weights: Partial<Record<InferKind, number>>;
  /** Cam the child must put on the empty pan. */
  answer: number;
}

/** What the child did: how many cam are on the empty pan. */
export interface InferAnswer {
  placed: number;
}

export const MAX_ANSWER = 10;

export function inferWeight(q: Pick<InferQuestion, "weights">, item: InferItem): number {
  return item === UNIT ? 1 : q.weights[item] ?? NaN;
}

/** Every answer the question scale could balance at, over all whole weights 1..maxW consistent with the clues. */
export function possibleAnswers(q: Pick<InferQuestion, "clues" | "asked">, maxW = 10): Set<number> {
  const kinds = [...new Set([...q.clues.flatMap((c) => [...c.left, ...c.right]), ...q.asked])].filter((i): i is InferKind => i !== UNIT);
  const out = new Set<number>();
  const w: Partial<Record<InferKind, number>> = {};
  const val = (i: InferItem) => (i === UNIT ? 1 : w[i]!);
  const total = (items: InferItem[]) => items.reduce((s, i) => s + val(i), 0);
  const rec = (i: number) => {
    if (i === kinds.length) {
      if (q.clues.every((c) => total(c.left) === total(c.right))) out.add(total(q.asked));
      return;
    }
    for (let x = 1; x <= maxW; x++) { w[kinds[i]!] = x; rec(i + 1); }
  };
  rec(0);
  return out;
}

/** "1 fruit = n cam", with the fruit on a random side. */
function oneEquals(fruit: InferItem, n: InferItem[], rng: Rng): InferClue {
  return rng.chance(0.5) ? { left: [fruit], right: n } : { left: n, right: [fruit] };
}
const cams = (n: number): InferItem[] => Array<InferItem>(n).fill(UNIT);

function make(pos: Position, rng: Rng): InferQuestion {
  const step = Math.min(pos.step, 2);
  const [a, b, c] = rng.shuffle(INFER_KINDS) as [InferKind, InferKind, InferKind];
  if (step === 2) {
    // c = r1 × b, b = r2 × cam
    const r1 = rng.pick([2, 3]);
    const r2 = rng.pick([2, 3, 4, 5].filter((r) => r1 * r <= MAX_ANSWER));
    const answer = r1 * r2;
    return {
      kind: "infer",
      clues: [oneEquals(c, Array<InferItem>(r1).fill(b), rng), oneEquals(b, cams(r2), rng)],
      asked: [c],
      tray: answer + rng.int(2, 3),
      weights: { [c]: answer, [b]: r2 },
      answer,
    };
  }
  const [va, vb] = rng.shuffle([2, 3, 4, 5]).slice(0, 2) as [number, number];
  const clues = [oneEquals(a, cams(va), rng), oneEquals(b, cams(vb), rng)];
  if (step === 0) {
    // 2 of one kind: the other clue is there to be ignored
    const asked: InferItem[] = [a, a];
    return { kind: "infer", clues: rng.chance(0.5) ? clues : [clues[1]!, clues[0]!], asked, tray: 2 * va + rng.int(2, 3), weights: { [a]: va, [b]: vb }, answer: 2 * va };
  }
  const [na, nb] = rng.pick([[1, 2], [2, 1], [2, 2]] as const);
  const asked: InferItem[] = rng.shuffle([...Array<InferItem>(na).fill(a), ...Array<InferItem>(nb).fill(b)]);
  const answer = na * va + nb * vb;
  return { kind: "infer", clues: rng.chance(0.5) ? clues : [clues[1]!, clues[0]!], asked, tray: answer + rng.int(2, 3), weights: { [a]: va, [b]: vb }, answer };
}

export function generateInfer(pos: Position, rng: Rng): InferQuestion {
  for (let i = 0; i < 100; i++) {
    const q = make(pos, rng);
    const answers = possibleAnswers(q);
    // exactly one answer fits the clues, it is the intended one, and it is small enough
    if (answers.size === 1 && answers.has(q.answer) && q.answer <= MAX_ANSWER) return q;
  }
  // always-valid fallback: 1 táo = 2 cam, 1 xoài = 3 cam; 2 xoài = 6 cam
  return {
    kind: "infer",
    clues: [{ left: ["red_apple"], right: cams(2) }, { left: ["mango"], right: cams(3) }],
    asked: ["mango", "mango"],
    tray: 8,
    weights: { red_apple: 2, mango: 3 },
    answer: 6,
  };
}

export function checkInfer(q: InferQuestion, a: InferAnswer): CheckResult {
  if (!a || typeof a.placed !== "number" || !Number.isFinite(a.placed) || a.placed < 1) return { correct: false, reason: "empty" };
  if (a.placed === q.answer) return { correct: true, reason: "right" };
  return { correct: false, reason: a.placed < q.answer ? "tooFew" : "tooMany", data: { placed: a.placed, need: q.answer } };
}

export const solveInfer = (q: InferQuestion): InferAnswer => ({ placed: q.answer });
