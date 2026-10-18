# 01. Giải mã hình (was "Tính theo hình")

Game id stays `equations`. Files: `src/games/equations/logic.ts`, `text.ts`, `src/ui/games/equations.ts` (+ css), `tests/games.test.ts`, `scripts/ui-check.mjs` (equations section).

## 1. Rename

- `title` in `src/games/index.ts` → **"Giải mã hình"**.
- Search for "Tính theo hình" in `src/`, `scripts/` and `docs/` and update every match (guide steps, manifest group name, guide-content). If a voice clip **says** the old name, change its words; the clip id can stay.

## 2. Every fruit has its own value (all tiers)

The teacher's rule: "no two fruits have the same number". In every generated question, all fruits that appear (known, in clues, or asked) have **different values**.
- Enforce it in the generators and in the `generate()` retry filter (add `distinctValues(q)` next to `isChainSolvable`).
- Values stay within 0–10 (`countSolutions` already brute-forces 0–10).
- **Test:** every position × 150 seeds gives distinct values. This joins the existing property tests.

## 3. A harder Vòng 1: several rows, forward only

The teacher's example: "cam = 1, táo = 2, chuối = 0; cam + táo = ?; chuối + táo = ?; cam + táo + chuối = ?"

Change the question shape so one question can have **several rows to fill**:

```ts
export interface AskRow { terms: Fruit[]; answer: number }
export interface EquationsQuestion {
  known: { fruit: Fruit; value: number }[];
  clues: Clue[];
  asks: AskRow[];           // was ask + answer; tiers 2–3 have exactly one row
}
export type EquationsAnswer = (number | null)[];   // one entry per row
```

- Add `"banana"` (chuối) to `FRUITS` (the emoji is already in `public/assets/emoji/`), so 0 can be a fruit's value as in the example.
- **Vòng 1 steps** (all values known, sums ≤ 10, the October rule):
  - step 0: 2 fruits, 2 rows of 2 terms, values 1–5
  - step 1: 3 fruits (one may be 0), 2 rows, one of them with 3 terms
  - step 2: 3 fruits (one may be 0), 3 rows, at least one with 3 terms
- No two rows have the same multiset of terms. A row may repeat a fruit (`cam + cam`).
- **Vòng 2/3:** keep today's generators and wrap the answer as one row. `questionRepeatsClue` and `countSolutions` work on each row.
- **`check`:** correct when every row is right.
  - Reasons: `empty` (any row blank, data: the blank indices), `wrongSum` / `wrongChain` with `data.wrongRows: number[]`.
  - The only first try that counts is the whole card, as before.
- **`solve`:** returns every row's answer.
- **View:**
  - Show each row with its own answer box. Tapping a box picks it; the numpad fills the picked box, and after a digit, focus moves on to the next empty box.
  - On a retry, rows that were right stay filled and turn green, and only the wrong rows are cleared.
  - Keep the `data-fruits` / `data-total` attributes on each row so `ui:check` can still solve from the screen.
  - Make the rows fit the panel at 3 rows × 3 terms. Check with `#/dev/equations/1/2/<seed>` for several seeds.
- **Text:** the prompt for several rows is a new clip, e.g. `eq_multi`: "Em tính từng dòng nhé!". The hint for wrong rows is a new clip, e.g. `eq_hint_rows`: "Có dòng chưa đúng. Em xem lại bảng số nhé!". Run `npm run audio:script`.

## Tests

- **Property tests:** each row's answer equals its sum; rows are unique; values are distinct; Vòng 1 sums are ≤ 10.
- **`check` tests:**
  - all rows right
  - one row wrong → `wrongRows` holds that row
  - a blank row → `empty`
- **`ui:check`:** a full set at Vòng 1 step 2 (3 rows); wrong row → retry keeps the right rows; leaving early.

## Done when

`#/dev/equations/1/2/<seed>` shows 3 rows, and a child can fill them, get one wrong, and fix only that row.
