// Pure parts of the UI layer (no DOM needed): routing and stage geometry.
import { describe, expect, it } from "vitest";
import { dailyLeftNow, defaultLimits, newUsage } from "../src/core/screentime.ts";
import { GATE_HOLD_MS } from "../src/ui/adultGate.ts";
import { clampPage, paginate } from "../src/ui/paginate.ts";
import { parseRoute } from "../src/ui/router.ts";
import { computeScale, isPortrait, STAGE_H, STAGE_W } from "../src/ui/stage.ts";

describe("parseRoute", () => {
  it("splits name and params", () => {
    expect(parseRoute("#/play/split")).toEqual({ name: "play", params: ["split"] });
    expect(parseRoute("#/dev/scale/2/1/42")).toEqual({ name: "dev", params: ["scale", "2", "1", "42"] });
  });
  it("handles empty, bare and odd hashes", () => {
    expect(parseRoute("")).toEqual({ name: "", params: [] });
    expect(parseRoute("#")).toEqual({ name: "", params: [] });
    expect(parseRoute("#/")).toEqual({ name: "", params: [] });
    expect(parseRoute("#/home/")).toEqual({ name: "home", params: [] });
    expect(parseRoute("#/play//split?x=1")).toEqual({ name: "play", params: ["split"] });
  });
  it("decodes escaped text", () => {
    expect(parseRoute("#/x/a%20b")).toEqual({ name: "x", params: ["a b"] });
  });
});

describe("stage geometry", () => {
  it("scales the 1180×820 stage to fit", () => {
    expect(computeScale(STAGE_W, STAGE_H)).toBe(1);
    expect(computeScale(2360, 1640)).toBe(2);
    expect(computeScale(1180, 400)).toBeCloseTo(400 / 820); // height is the limit
    expect(computeScale(590, 2000)).toBe(0.5); // width is the limit
  });
  it("asks portrait screens and phones to turn the device or use a tablet", () => {
    expect(isPortrait(820, 1180)).toBe(true); // iPad upright
    expect(isPortrait(1180, 820)).toBe(false); // iPad landscape
    expect(isPortrait(1920, 1080)).toBe(false); // desktop
    expect(isPortrait(844, 390)).toBe(true); // phone sideways: still too small
  });
});

describe("adult gate", () => {
  it("must be held for about a second", () => {
    expect(GATE_HOLD_MS).toBeGreaterThanOrEqual(1000);
    expect(GATE_HOLD_MS).toBeLessThanOrEqual(1500);
  });
});

describe("paginate", () => {
  it("splits into pages and never returns zero pages", () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(paginate([1, 2], 2)).toEqual([[1, 2]]);
    expect(paginate([], 8)).toEqual([[]]);
    expect(clampPage(5, 3)).toBe(2);
    expect(clampPage(-1, 3)).toBe(0);
    expect(clampPage(Infinity, 3)).toBe(2);
  });
});

describe("daily time left (home screen)", () => {
  const limits = defaultLimits();
  it("counts played time and adult bonus for today only", () => {
    const u = { ...newUsage("2026-10-17", 0), playedMs: 8 * 60000, bonusMs: 10 * 60000 };
    expect(dailyLeftNow(u, limits, "2026-10-17")).toBe(32 * 60000);
    expect(dailyLeftNow(u, limits, "2026-10-18")).toBe(limits.dailyMin * 60000); // stale usage = fresh day
    expect(dailyLeftNow({ ...u, playedMs: 99 * 60000 }, limits, "2026-10-17")).toBe(0);
  });
});
