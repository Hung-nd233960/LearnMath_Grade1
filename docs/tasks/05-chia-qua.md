# 05. Chia quả (was "Giỏ trái cây")

Game id stays `basket`. Files: `src/games/basket/logic.ts`, `text.ts`, `src/ui/games/basket.ts` (+ css), tests, `ui:check` basket section.

## 1. Rename

- `title` → **"Chia quả"**.
- Update every "Giỏ trái cây" in `src/`, `scripts/` and `docs/`. Clip words that say the old name change; ids stay.

## 2. New Vòng 3 hidden steps

The teachers' "Vòng 4/5" go inside Vòng 3, which becomes:

| step | Kind | Example |
|---|---|---|
| 0 | several kinds (today's tier 3, including the "không quả …" trick) | "Đưa cho tôi 2 quả táo và 3 quả chuối" |
| 1 | **cần thêm** (add to reach a total) | "Trong giỏ của Mèo có 5 quả cam. Mèo muốn có tất cả 15 quả cam. Em đưa thêm cho Mèo nhé! Em đã đưa thêm mấy quả?" |
| 2 | **bằng nhau** (make the baskets equal) | "Giỏ của em có 10 quả táo, giỏ của Mèo có 2 quả táo. Em chuyển táo sang giỏ của Mèo để hai giỏ bằng nhau nhé!" |

"Để Mèo có nhiều hơn em 2 quả" is **not** built (too hard in October). Add it to BUILD_PLAN "Later".

### Cần thêm (`mode: "addTo"`)

- **Setup:** Mèo's basket starts with `start` fruit (1–9), the target is `start < target ≤ 20`, and `need = target − start`. When `need ≥ 10` the kind is **tangerine**, because only tangerines come in bags of 10; the child's basket then has bags as in Vòng 2.
- **Child's basket:** keep the `MIN_LOOSE`/`MAX_LOOSE` rule (2–9 loose).
- **Interaction:** the child moves fruit into Mèo's basket **and** types how many they added on a small numpad box ("Em đã đưa thêm ☐ quả"). "Xong" sends both.
- **Answer:** `BasketAnswer & { said?: number }`. The answer describes what the child **moved**; the view adds Mèo's starting fruit only for drawing.
- **`check`:**
  - correct when Mèo's total = `target` **and** `said === need`
  - `tooFew` / `tooMany` as today, checked first
  - then `wrongSaid` (data: said, need), with the hint "Em đếm lại số quả em vừa đưa thêm nhé!"
  - `empty` if `said` is missing
- **Counts hidden** (Vòng 3 rule).

### Bằng nhau (`mode: "equalize"`)

- **Setup:** one kind; the child's basket holds `c` (4–10) and Mèo's `m` (0–4); `c − m` is even; `c + m ≤ 14`. Answer: move `(c − m) / 2`.
- **Scoring:** score the **end state** (two equal baskets), not a typed number.
- **Retries:** fruit can go back and forth.
- **`check`:** correct when both baskets are equal; otherwise `childMore` / `meoMore` (data: both counts).
- **Counts hidden**, but draw each basket's fruit in rows of 5 (ten-frame style) so the two baskets are easy to compare by eye. Check that the basket view's layout does this, and add it if not.

## Text and voice

- **Sentences built with `say()` from number clips:** new pieces such as `basket_meo_has` ("Trong giỏ của Mèo có"), `basket_meo_wants` ("Mèo muốn có tất cả"), `basket_give_more` ("Em đưa thêm cho Mèo nhé!"), `basket_how_many_more` ("Em đã đưa thêm mấy quả?"), `basket_you_have` ("Giỏ của em có"), `basket_make_equal` ("Em chuyển sang giỏ của Mèo để hai giỏ bằng nhau nhé!"), plus the hints.
- **Reuse existing clips:** look through the manifest before adding, since the number and fruit-name clips already exist.
- **The text panel** follows the existing rule (shown after the first wrong try, or always when sound is off). These prompts are long, so the "nghe lại" button matters.
- Run `npm run audio:script`.

## Tests

- **Property tests:**
  - addTo: `need` correct; bags only when needed; totals ≤ 20; loose 2–9
  - equalize: even difference, limits respected, `solve` gives equal baskets
- **`check` cases:** right total + wrong said → `wrongSaid`; equal baskets in any way → correct.
- **ui:check:**
  - addTo at `#/dev/basket/3/1/<seed>`: move, type, Xong; wrong said → retry
  - equalize at `#/dev/basket/3/2/<seed>`: move until equal; too many → hint → move back

## Done when

Both new modes play end to end on the dev route and inside a normal set at Vòng 3.
