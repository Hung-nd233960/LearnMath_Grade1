# 03. Quy luật (new game, id `pattern`)

Reference images: `docs/feedbacks/round-2/ref-quy-luat-*.png`. The developer worried this would feel like an IQ test with arguable answers. The rule for this game is therefore: **only generate puzzles with exactly one answer, and prove it in code.** The dot-grid kind (`ref-quy-luat-dots.png`) is **not** used.

Task 02 already added `pattern` to `GAME_IDS`, the registry (`ready: false`) and the save migration. This task builds the real logic and view, then sets `ready: true`.

## Puzzle kinds

Use fruit (Fluent emoji already in `public/assets/emoji/`) and simple shapes drawn in SVG (circle, triangle, square; 3 clearly different colours). **No animals.**

1. **`repeat`**: a repeating row with one blank. Units: AB, ABC, AAB, ABB, AABB.
   - Show at least **2 full cycles plus 1** item, so the unit is clear.
   - The unit must not itself be a repeat (no "ABAB" as a unit; "AA" isn't a unit).
2. **`number`**: a number row, e.g. 2, 4, 6, ?, 10. Steps +1, +2, +10, −1, within 0–20 (or 0–100 for +10 with tens only).
3. **`rotate`**: a diamond or square with a dot on one corner. The dot moves round the corners by a fixed step each frame (clockwise, step 1 or 2). Show at least 4 frames; one is blank.
4. **`grid`**: a 3×3 grid in which each cell is an outer shape with a smaller inner shape. Each row and column has each outer shape exactly once and each inner shape exactly once (two Latin squares). One cell is blank (any cell from step 2, the bottom-right before that).

## Tiers

| Vòng | step 0 | step 1 | step 2 |
|---|---|---|---|
| 1 | repeat AB, fruit, blank at the end, 3 options | repeat ABC / AAB, fruit, blank at the end | repeat AB / ABB with shapes where shape and colour change together |
| 2 | repeat, blank **in the middle**, 4 options | number +1 / +2 (0–20) | number +10 / −1; repeat AABB |
| 3 | rotate, step 1 | rotate step 2, or blank in the middle | grid 3×3 |

## Logic (`src/games/pattern/logic.ts`, pure)

```ts
type Token = { kind: "fruit"; fruit: string } | { kind: "shape"; shape: "circle" | "triangle" | "square"; color: 0 | 1 | 2 }
           | { kind: "num"; n: number } | { kind: "dot"; frame: "diamond" | "square"; corner: 0 | 1 | 2 | 3 }
           | { kind: "cell"; outer: Shape; inner: Shape };
interface PatternQuestion { kind: "repeat" | "number" | "rotate" | "grid"; items: (Token | null)[]; cols?: number; options: Token[]; answer: number /* index into options */ }
type PatternAnswer = number; // index of the tapped option
```

- **Options:** 3 or 4, shuffled, all different. Distractors are tokens that occur elsewhere in the puzzle (so a wrong pick is never absurd). For `number`, distractors are ±1 and ±step.
- **Uniqueness, checked in `generate()` with a retry, and in tests:**
  - **repeat:** filling the blank with option i gives a full row; compute its smallest period. The correct option must be the **only** one whose row has the intended period, and no option gives a smaller one.
  - **number:** only the correct option keeps a constant difference.
  - **rotate:** only the correct option keeps a constant corner step.
  - **grid:** only the correct option keeps every row and column free of repeated outer and repeated inner shapes.
- **`check`:** `right` / `wrongPick` (data: picked).
- **`solve`:** `answer`.
- **Tests:** every position × 150 seeds: valid, exactly one option fits, options distinct, unit not a repeat; plus `check` cases.

## View (`src/ui/games/pattern.ts` + css)

- **The puzzle:**
  - top: the row (or grid) on a wooden board, like the tile art (`docs/feedbacks/round-2/tile-quy-luat.png`)
  - the blank is a dashed box with "?"
  - below: the options as big tappable cards (≥ 120 px)
- **Answering:**
  - tapping an option puts it in the blank (child can change it), and "Xong" submits
  - drag the option onto the blank also works (the tap fallback rule)
- **Reveal:** the right option flies into the blank.
- Wrong first try → the retry clears the blank.
- Draw shapes with inline SVG; same size and stroke so only shape and colour differ.
- **`data-` attributes** on items and options, so `ui:check` can solve from the screen.
- Register the view in `src/ui/games/index.ts`; set `ready: true`; add home tile art in `home.ts` `tileArt()` (task 07 replaces it with the real art, so a simple placeholder is enough: 🔴🔺🔴?).

## Text and voice (new manifest group "Quy luật")

- **Prompts:**
  - `pattern_prompt`: "Tìm hình còn thiếu nhé!"
  - `pattern_number`: "Tìm số còn thiếu nhé!"
- **Hints:**
  - `pattern_hint_repeat`: "Em xem mấy hình đầu lặp lại thế nào nhé."
  - `pattern_hint_number`: "Mỗi lần số tăng hay giảm mấy?"
  - `pattern_hint_rotate`: "Em xem chấm xanh đi theo chiều nào nhé."
  - `pattern_hint_grid`: "Mỗi hàng có đủ ba hình, không hình nào lặp lại."
- **Guide (i):** `guide_pattern_1…4`.
- **Music:** rename the `compare` track in `src/audio/music.ts` to `pattern` (it exists already; keep the tune).
- **Decor:** add `pattern` to `src/ui/decor.ts` (shapes and fruit).
- Run `npm run audio:script`.

## ui:check

New section:
- a whole set at Vòng 1
- a wrong pick → retry → right
- reveal
- dev route at each kind: `#/dev/pattern/<t>/<s>/<seed>`

## Done when

- The tile is playable.
- Every kind at every step has been looked at on the dev route.
- The uniqueness tests pass for every position × 150 seeds.
