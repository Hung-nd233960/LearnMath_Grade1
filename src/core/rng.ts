// Small seeded random generator (mulberry32). Game logic must only use this,
// never Math.random, so questions are reproducible in tests and bug reports.

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** New shuffled array; the input is not changed. */
  shuffle<T>(items: readonly T[]): T[];
  /** True with probability p. */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    if (max < min) throw new Error(`rng.int: max ${max} < min ${min}`);
    return min + Math.floor(next() * (max - min + 1));
  };
  return {
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new Error("rng.pick: empty list");
      return items[int(0, items.length - 1)]!;
    },
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    chance: (p) => next() < p,
  };
}

/** A fresh seed for real play (not for tests). */
export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
