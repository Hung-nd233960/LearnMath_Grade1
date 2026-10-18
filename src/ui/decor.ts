// Faint pictures drifting at the screen edges ("Trang trí nền"). They are always in the
// DOM; CSS shows them only when <html> has fx-decor and animates them with fx-anim.
import { emoji, h } from "./dom.ts";

/** Fluent Emoji stems per screen. A screen without an entry gets "home". The teacher area gets none. */
export const DECOR_SETS: Record<string, string[]> = {
  home: ["glowing_star", "rainbow", "sparkles", "red_apple", "kite", "star"],
  who: ["rainbow", "star", "kite", "sparkles", "sun_with_face", "glowing_star"],
  scale: ["grapes", "red_apple", "watermelon", "star", "grapes", "sparkles"],
  robot: ["star", "rocket", "sparkles", "glowing_star", "triangular_flag", "star"],
  basket: ["tangerine", "banana", "red_apple", "sparkles", "strawberry", "tangerine"],
  equations: ["red_apple", "pear", "watermelon", "sparkles", "input_numbers", "star"],
  split: ["tulip", "sunflower", "cherry_blossom", "hibiscus", "tulip", "sparkles"],
  pattern: ["wrapped_gift", "star", "wrapped_gift", "sparkles", "balance_scale", "glowing_star"],
  break: ["star", "sparkles", "glowing_star", "star", "sparkles", "seedling"],
  locked: ["star", "sparkles", "glowing_star", "star", "sparkles", "seedling"],
};

// left, top, size — chosen to stay out of the play area
const SPOTS: [number, number, number][] = [[18, 118, 74], [1092, 128, 66], [10, 452, 64], [1110, 430, 72], [96, 740, 60], [1040, 744, 70]];

/** Prepend the decoration layer to a screen. `key` selects the picture set (null = none). */
export function mountDecor(screen: HTMLElement, key: string | null): void {
  if (key === null) return;
  const set = DECOR_SETS[key] ?? DECOR_SETS.home!;
  const layer = h("div", { class: "decor" });
  SPOTS.forEach(([x, y, size], i) => {
    const img = emoji(set[i % set.length]!, size);
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    layer.append(img);
  });
  screen.prepend(layer);
}
