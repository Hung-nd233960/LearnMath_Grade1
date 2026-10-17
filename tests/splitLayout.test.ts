import { describe, expect, it } from "vitest";
import { basketSpots, ITEM, SCENE_H, SCENE_W, vaseSpots, type Spot } from "../src/ui/games/splitLayout.ts";

function check(spots: Spot[], n: number) {
  expect(spots).toHaveLength(n);
  for (const s of spots) {
    expect(s.x - ITEM / 2).toBeGreaterThanOrEqual(0);
    expect(s.x + ITEM / 2).toBeLessThanOrEqual(SCENE_W);
    expect(s.y - ITEM / 2).toBeGreaterThanOrEqual(30); // keep clear of the hint line at the top
    expect(s.y + ITEM / 2).toBeLessThanOrEqual(SCENE_H);
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(spots[i]!.x - spots[j]!.x, spots[i]!.y - spots[j]!.y);
      expect(d, `items ${i} and ${j} of ${n} overlap`).toBeGreaterThanOrEqual(ITEM * 0.9);
    }
  }
}

describe("split picture layout", () => {
  it("vase: 1..10 flowers fit and do not overlap", () => {
    for (let n = 1; n <= 10; n++) check(vaseSpots(n), n);
  });
  it("basket: 1..15 fruit fit and do not overlap", () => {
    for (let n = 1; n <= 15; n++) check(basketSpots(n), n);
  });
  it("flowers stay above the vase mouth", () => {
    for (let n = 1; n <= 10; n++) for (const s of vaseSpots(n)) expect(s.y + ITEM / 2).toBeLessThan(400);
  });
  it("basket fruit rest on the rim, not below it", () => {
    for (const s of basketSpots(10)) expect(s.y).toBeLessThanOrEqual(390);
  });
});
