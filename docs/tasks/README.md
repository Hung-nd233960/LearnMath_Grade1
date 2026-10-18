# Feedback round 2: task files

These files turn the teachers' second round of feedback into work items, one file per item. The feedback itself and the decisions behind it are in [docs/feedbacks/round-2.md](../feedbacks/round-2.md).

Written 2026-10-18 after the feedback was discussed with the developer.

## How to work

- Do the tasks **in order**. Later tasks assume earlier ones are done (02 and 03 share one save migration, 04 needs the final list of games, 08 comes before 11).
- Before you start, read `.claude/CLAUDE.md`, [ARCHITECTURE.md](../ARCHITECTURE.md), [RULES.md](../RULES.md) and [UI_GUIDE.md](../UI_GUIDE.md). **Where a task file disagrees with CLAUDE.md, the task file wins.** Task 10 brings CLAUDE.md up to date at the end.
- After each task, these must pass: `npm test`, `npm run typecheck`, and `npm run ui:check` (with `npm run dev` running). Fix any `ui:check` sections a task breaks; don't delete them.
- Tick the task in [BUILD_PLAN.md](../BUILD_PLAN.md), section 14, and add a short "what was built" note in the style of the earlier sections.
- Keep the project's conventions: `core/` and `games/` stay pure (no DOM, timers, storage or `Math.random`); every rule change gets a test; children's text goes through `say()` with clips in `src/audio/manifest.ts`, then `npm run audio:script`; views never judge answers.
- **Don't add dependencies** without asking the developer.
- **Commit after each task**, with a message that names the task.
- If a task says **"Ask the developer"**, stop at that point and ask. Don't guess.

## Decisions that override CLAUDE.md (agreed 2026-10-18)

1. **Games (still 6 tiles, 3×2):** Thăng bằng (Cái cân + So sánh cân merged), Rô-bốt, Chia quả (renamed from Giỏ trái cây), Giải mã hình (renamed from Tính theo hình), Mấy và mấy, and **Quy luật** (new). The game id `compare` is removed, `pattern` is added, and `scale`, `basket` and `equations` keep their ids so saved progress carries over.
2. **There are still 3 visible rounds (`MAX_TIER = 3`).** The teachers' "Vòng 4/5" become the hidden steps of Vòng 3. Don't add tiers.
3. **Animals are now allowed**, but only free in a garden or open nature. Never in cages, behind fences or in tanks, and never carried between baskets. Use gentle, familiar animals (rabbits, chicks). Avoid anything scary.
4. **Phones in landscape are supported** (task 08). Portrait still shows the "turn sideways" notice.
5. **Daily plan:** a child plays a limited number of games per day, one after another, in a fixed order (task 04).

## Tasks

| # | File | What | Size |
|---|---|---|---|
| 00 | [00-feedback-docs.md](00-feedback-docs.md) | Tidy the feedback into `docs/feedbacks/`, move the images | S |
| 01 | [01-giai-ma-hinh.md](01-giai-ma-hinh.md) | Rename Tính theo hình; harder Vòng 1 (several rows); every fruit has its own value | M |
| 02 | [02-thang-bang.md](02-thang-bang.md) | Merge Cái cân + So sánh cân into Thăng bằng; add inference levels; save migration | L |
| 03 | [03-quy-luat.md](03-quy-luat.md) | New game Quy luật (patterns) | L |
| 04 | [04-daily-plan.md](04-daily-plan.md) | Games per day, fixed order, locked tiles, replay for no credit | M |
| 05 | [05-chia-qua.md](05-chia-qua.md) | Rename Giỏ trái cây; "cần thêm bao nhiêu" and "make them equal" levels | M |
| 06 | [06-may-va-may-garden.md](06-may-va-may-garden.md) | Garden scene with animals | M |
| 07 | [07-art.md](07-art.md) | Living tile scenes in HTML/CSS/SVG (swaying leaves, clouds, sparkles); new Mèo look | M |
| 08 | [08-phone.md](08-phone.md) | Phone access in landscape, wide layout | L |
| 09 | [09-voice.md](09-voice.md) | Nam Minh (Northern) as the default voice; generate the new clips | S |
| 10 | [10-docs-sync.md](10-docs-sync.md) | CLAUDE.md, RULES, guide pages, screenshots | M |
| 11 | [11-tauri-sizes.md](11-tauri-sizes.md) | Three desktop builds: 16:9, iPad, iPhone 15 | S |
