// Where the flowers / fruit of "Mấy và mấy" sit in the 460×608 picture panel. Pure and tested:
// items must stay inside the panel and never overlap, for every count a question can have.
export const SCENE_W = 460;
export const SCENE_H = 608;
export const ITEM = 80;

export interface Spot {
  /** Centre of the item, in panel pixels. */
  x: number;
  y: number;
}

const CX = SCENE_W / 2;

/** Flowers fanned out above the vase mouth. One arched row up to 5, otherwise two rows. */
export function vaseSpots(n: number): Spot[] {
  const rows = n <= 5 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const rowY = n <= 5 ? [250] : [175, 295];
  const spots: Spot[] = [];
  rows.forEach((m, r) => {
    for (let j = 0; j < m; j++) {
      const d = j - (m - 1) / 2;
      spots.push({ x: CX + d * 84, y: rowY[r]! + d * d * 5 }); // centre higher than the edges: a gentle arch
    }
  });
  return spots;
}

/**
 * Animals standing on the lawn: one row up to 4, two rows up to 8, three rows up to 10. Rows are evenly filled
 * (the bottom row gets any extra) and every other row is shifted a little, so it looks like a group and not a grid.
 */
export function gardenSpots(n: number): Spot[] {
  const rows = n <= 4 ? 1 : n <= 8 ? 2 : 3;
  const rowY = rows === 1 ? [470] : rows === 2 ? [420, 520] : [340, 430, 520];
  const sizes: number[] = [];
  for (let r = 0; r < rows; r++) sizes.push(Math.floor(n / rows) + (r >= rows - (n % rows) ? 1 : 0));
  const spots: Spot[] = [];
  sizes.forEach((m, r) => {
    const shift = r % 2 === 0 ? -22 : 22;
    for (let j = 0; j < m; j++) spots.push({ x: CX + shift + (j - (m - 1) / 2) * 96, y: rowY[r]! });
  });
  return spots;
}

/** Fruit heaped in a basket, filled from the bottom row up (5, 4, 3, 2, 1 per row). */
export function basketSpots(n: number): Spot[] {
  const spots: Spot[] = [];
  let left = n;
  for (let cap = 5, row = 0; left > 0 && cap >= 1; cap--, row++) {
    const m = Math.min(cap, left);
    // Every row sits on the grid of its full width (each row is half a step offset from the one
    // below), so a partly filled row interleaves with the full row under it and never sits on top of it.
    const first = Math.floor((cap - m) / 2);
    for (let j = 0; j < m; j++) spots.push({ x: CX + (first + j - (cap - 1) / 2) * 84, y: 390 - row * 64 });
    left -= m;
  }
  return spots;
}
