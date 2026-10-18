# 02. Thăng bằng (Cái cân + So sánh cân merged)

The biggest task. Read [docs/feedbacks/round-2.md](../feedbacks/round-2.md) (Thăng bằng part, and the two worksheet images `ref-thang-bang-*.png`) first.

## What the game becomes

The game id stays **`scale`**, so children keep their progress. The title becomes **"Thăng bằng"**. The `compare` game is removed as a separate tile; its logic and view are reused **inside** Thăng bằng.

The teacher's five stages map onto 3 visible rounds × 3 hidden steps:

| Vòng | step 0 | step 1 | step 2 |
|---|---|---|---|
| 1 | Balance by adding fruit, one kind, live tilt, counts and >,<,= (old Cái cân T1) | Balance with the weight key, two kinds, padlock (old T2) | Balance, three kinds, padlock (old T3) |
| 2 | Heaviest / lightest of 3 boxes (old compare T1) | Heaviest / lightest of 4 boxes, sides shuffled (old compare T2) | Put 3–4 boxes in order, light → heavy (old compare "order", scales shuffled) |
| 3 | **Inference, one chain**: two clue scales, then fill the empty pan (see below), asking about one kind | Inference, one chain, asking a mix (e.g. 2 xoài + 1 táo) | **Inference, two chains** (A = 2 B, B = 2 C, so A = ? C) |

The step tables in today's `scale/logic.ts` (T1/T2/T3) and `compare/logic.ts` are the source for rounds 1–2. Keep their numbers where they fit and adjust them so difficulty rises step by step.

## Logic

- **`src/games/scale/logic.ts`:**
  - **Question:** a tagged union, `ScaleQuestion = { kind: "balance", … } | { kind: "compare", … } | { kind: "infer", … }`.
  - **Answer:** also a union. `check`, `solve` and `generate` dispatch on `kind`.
  - **Moving the compare code:** move what `compare/logic.ts` does into `src/games/scale/compare.ts` (pure) and import it. Then delete `src/games/compare/` (logic and text). Its text lines move into `scale/text.ts`; keep the clip ids.
- **Inference (`kind: "infer"`):**
  - **Fruits:** xoài (mango), táo (red_apple), dưa hấu (watermelon), with cam (tangerine) as the unit. **Fruit only, no animals** (the worksheet's tiger, cat and duck become fruit).
  - **Downloading mango:** download the Fluent Emoji 3D `mango_3d.png` (MIT, the same source as the other files in `public/assets/emoji/`; see `LICENSE-FluentEmoji.txt`).
  - **Weights are hidden.** The child only sees balanced clue scales.
  - **One chain:** clue 1 is a balanced scale "1 xoài = 3 cam", clue 2 "1 táo = 2 cam". The question scale has the asked fruit on the left pan, an empty right pan, and a tray of cam. The child drags cam onto the empty pan and presses "Xong".
  - **Two chains:** clue 1 "1 dưa hấu = 2 táo", clue 2 "1 táo = 2 cam"; the question scale holds "1 dưa hấu", answered in cam. Answer 4.
  - **Limits:**
    - each value is 1–5 cam
    - the answer is ≤ 10 cam (October rule)
    - the tray holds the answer + 2–3 extra cam
    - the clue scales hold at most 5 items per pan
  - **Answer:** `{ placed: number }` (cam on the empty pan).
  - **`check`:** correct when `placed === answer`. Reasons are `tooFew` / `tooMany` (data: placed, need) and `empty`.
  - **Uniqueness:** there is exactly one answer by construction. Write a brute-force test anyway: for weights 1–10 of every hidden kind, all assignments that satisfy the clues give the same answer.
- **Tests:** keep the existing scale and compare tests, now run through the merged logic, and add property tests for `infer` (every position × 150 seeds: solvable, unique, limits respected) and `check` cases.

## View

- **`src/ui/games/scale.ts` becomes a small dispatcher** that mounts one of three sub-views by `q.kind`:
  - balance: today's `scale.ts` code, moved to e.g. `scale/balance.ts`
  - compare: today's `compare.ts`
  - infer: new
- **The play loop still sees one `GameView`.** `GameView` methods (`playResult`, `reveal`, `reset`) forward to the active sub-view.
- **Infer layout:** two small clue scales across the top, already balanced and level (reuse the small-scale drawing from `compare.ts`, but with fruit instead of gift boxes). Below them, one big scale (reuse the balance scale) with the asked fruit fixed on the left, the empty right pan, and the tray of cam.
  - Use the padlock: the beam stays level until "Xong", then tips to show the result, as in balance Vòng 2+.
  - Drag and tap-then-tap both work; cam can be taken back off the pan.
  - **Reveal:** puts the right number of cam on the pan.
- **Demo ("Xem Mèo làm mẫu"):** the existing scale demo in `src/ui/games/demos.ts` must keep working (it uses a balance question). Update its sample if the question shape changed. The demo test in `tests/games.test.ts` must pass.
- **Music:** `scale` keeps its track; `compare`'s track becomes `pattern`'s track in task 03 (rename it there).
- **Decor:** `src/ui/decor.ts` drops its `compare` entry (the `pattern` entry comes in task 03).

## Text and voice

- **Prompts per kind:**
  - balance: existing
  - compare: existing compare prompts
  - infer, one line per variant: new clips, e.g.
    - `infer_one`: "Nhìn hai cân trên nhé. Em đặt bao nhiêu quả cam để cân thăng bằng?"
    - `infer_hint_few`: "Đĩa cam còn nhẹ quá. Em xem lại cân thứ nhất nhé!"
    - `infer_hint_many`: "Nhiều cam quá rồi!"
- **Guide (i):** rewrite the 4 steps (`guide_scale_1…4`) to cover the whole game. Remove the `guide_compare_*` clips.
- **Manifest:** rename the group "Cái cân" → "Thăng bằng" and merge the "So sánh cân" group into it.
- Run `npm run audio:script`.

## Registry and save migration (shared with task 03)

1. `src/core/types.ts`: `GAME_IDS = ["scale", "robot", "basket", "equations", "split", "pattern"]`.
2. `src/games/index.ts`:
   - `scale` → title "Thăng bằng"
   - remove `compare`
   - add a `pattern` entry with `ready: false` (title "Quy luật"). Its tile then shows "Sắp ra mắt" until task 03.
   - **Logic stub:** `pattern` needs logic. Add a minimal stub `src/games/pattern/logic.ts` + `text.ts` that task 03 replaces.
3. Bump **`SCHEMA` to 2** in `src/core/storage.ts` and add a migration step 1 → 2:
   - drop `games.compare` from each profile, and add `games.pattern` (fresh progress)
   - `games.scale.seed`: the meaning of the scale tiers changed. **Cap the seed at Vòng 1 step 2** (`{ tier: 1, step: 2 }`), so nobody starts in content they have never seen
   - keep `history` records with `game: "compare"` (they are history); make sure any screen that lists history or per-game data (teacher area "Học sinh" tab) ignores unknown game ids instead of crashing
   - `migrate()` must accept schema 1 **and** 2, and an **import** of an old schema-1 backup must work too
4. **Tests** (`tests/storage.test.ts`):
   - a schema-1 save with `compare` progress and a scale seed at Vòng 3 migrates as described
   - a schema-2 save loads unchanged
   - importing a schema-1 export works

## ui:check

- **Replace the "So sánh cân" section** with checks for Thăng bằng Vòng 2 via the dev route (`#/dev/scale/2/<step>/<seed>`), keeping the same checks: work out the order from the scales on screen, nudge, prefix kept.
- **Add Vòng 3:** read the clue scales from the DOM (add `data-` attributes), compute the answer, place cam, press Xong; also too few → retry hint; reveal.

## Done when

- All three kinds play through `#/dev/scale/<t>/<s>/<seed>` for every tier and step.
- A whole set plays from the home tile.
- An old save with a So sánh cân seed loads without error.
