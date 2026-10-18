# 10. Docs and user guide sync

Do this after tasks 01–09.

## `.claude/CLAUDE.md`

Update it to match what was built. Keep its style (short bullet points) and its sections.
- **Game table:**
  - Thăng bằng (merged; Vòng 1 balance, Vòng 2 compare/order, Vòng 3 inference)
  - Rô-bốt
  - Chia quả
  - Giải mã hình
  - Mấy và mấy
  - Quy luật

  Update each game's section, delete the "So sánh cân" section (fold it into Thăng bằng), and add a Quy luật section with its uniqueness rule.
- **Visual style:** replace "**No animals**" with the new rule: animals only free in a garden or open nature; never caged, fenced in or carried between baskets; kinds differ by shape.
- **Constraints:** phones in landscape are supported with a wide layout; portrait shows the notice.
- **Product rules:** add the daily plan (games per day, warm-up / random order, one at a time, replay for no credit).
- **Guide (i):** if the guide steps changed, say so.
- Mention `docs/feedbacks/` and `docs/tasks/` under "Start here".
- **"Known mockup issues":** add that the mockups (`mockup/v2/`) predate round 2 and don't show the merged or new games. Don't edit the mockups.

## Other docs

- **[RULES.md](../RULES.md):** the daily-plan rules and settings; the new per-game knobs (equations rows and distinct values, Thăng bằng kinds per step, Chia quả modes, Quy luật kinds per step); the wide-layout threshold.
- **[ARCHITECTURE.md](../ARCHITECTURE.md):** `core/dailyPlan.ts`, the `pattern` game, the merged `scale` folder layout, `SCHEMA` 2 and its migration step, `computeLayout` / `body.wide`.
- **[UI_GUIDE.md](../UI_GUIDE.md):** the wide layout rules (stage sizes, `--tap-min`, how to test at 852×393) and the tile art.
- **[BUILD_PLAN.md](../BUILD_PLAN.md):** section 14 ticked with notes; "Later" gains "Chia quả: Mèo nhiều hơn em N quả".
- **`README.md`** (repo root): the game list and screenshots if it has them.

## User guide (`docs/guide/`)

- Update `scripts/guide-content.mjs` (Vietnamese and English) with the new names, the merged game, Quy luật, the daily plan (a teacher section on the new settings), and phone use.
- With `npm run dev` running: `node scripts/guide-shots.mjs`, then `node scripts/make-guide.mjs`. Check that the pages and both worked-example videos still build.

## Done when

- `grep -ri "So sánh cân\|Giỏ trái cây\|Tính theo hình\|Cái cân" src docs scripts .claude` only finds historical mentions (feedback files, BUILD_PLAN history).
- The guide shows the new home screen.
