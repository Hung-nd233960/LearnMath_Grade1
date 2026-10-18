# 00. Feedback docs: tidy and move

## Goal

The repo root has `Feedback_round_2_and_thoughts.md` and 13 loose screenshots (`image.png`, `image-1.png` … `image-12.png`). Move them into `docs/feedbacks/` and rewrite the notes as a clean document.

## Steps

1. Create `docs/feedbacks/round-2/` and move the images there with `git mv` (they are untracked, so a plain move and then `git add` is fine). Use these names:

   | Old | New | What it shows |
   |---|---|---|
   | image.png | meo-smarty.png | New Mèo design (detective hat, cape, magnifier) |
   | image-1.png | tile-thang-bang.png | Tile art: Thăng bằng |
   | image-2.png | tile-robot.png | Tile art: Rô-bốt |
   | image-3.png | tile-chia-qua.png | Tile art: Chia quả |
   | image-4.png | tile-giai-ma-hinh.png | Tile art: Giải mã hình |
   | image-5.png | tile-may-va-may.png | Tile art: Mấy và mấy |
   | image-6.png | tile-quy-luat.png | Tile art: Quy luật |
   | image-7.png | ref-thang-bang-one-chain.png | Worksheet: xoài = 3 cam, táo = 2 cam, 2 xoài + 1 táo = ? cam |
   | image-8.png | ref-thang-bang-two-chain.png | Worksheet: hổ = 2 mèo, mèo = 2 vịt, hổ = ? vịt |
   | image-9.png | ref-quy-luat-sequence-1.png | Worksheet: repeating sequence of animal heads |
   | image-10.png | ref-quy-luat-grid.png | Worksheet: 3×3 grid of outer and inner shapes |
   | image-11.png | ref-quy-luat-dots.png | Worksheet: dot grids (no clear rule, **not used**) |
   | image-12.png | ref-quy-luat-sequence-2.png | Worksheet: repeating sequence + a dot moving round a diamond |

2. Write `docs/feedbacks/round-2.md` in clear English. Children's lines and Vietnamese names stay in Vietnamese **with correct diacritics** (the original note has some without: "tro nay se mo ngay mai" → "Trò này sẽ mở vào ngày mai nhé!", "be hoan thanh game truoc da nhe" → "Bé hoàn thành trò trước đã nhé!", "De Meo co nhieu hon em 2 qua tao" → "Để Mèo có nhiều hơn em 2 quả táo?"). Use three clearly separated parts:
   - **What the teachers asked for**: every point from the original, faithful to its meaning, grouped by game. Embed each image under its point with a relative link (`round-2/tile-robot.png`).
   - **Developer's notes**: the developer's own opinions from the original (doesn't like phone use; Quy luật feels like an IQ test and may be hard to generate; animal concerns).
   - **Decisions (2026-10-18)**: copy the "Decisions that override CLAUDE.md" list from [README.md](README.md), plus these points:
     - Vòng 4/5 are mapped onto hidden steps of Vòng 3.
     - Daily plan: "finish a game" = one set of 5; the order is "warm-up" (lowest level first) or random, chosen by the teacher; a game left mid-set keeps the others locked; finished games can be replayed for no credit.
     - Chia quả: "Mèo nhiều hơn em 2" is left out for now (too hard in October).
     - Mấy và mấy: the two kinds must differ by shape, not just colour; motion isn't used to tell them apart; the garden stays a faded background.
     - Quy luật: only rules with exactly one answer (repeats with at least 2 full cycles, a moving dot, a 3×3 grid); the dot-grid kind is dropped.
     - Phones: landscape only, with a wide layout.

   Each decision links to its task file in `docs/tasks/`.
3. Delete the root `Feedback_round_2_and_thoughts.md` once its content is in the new file. Check that no image is left at the root (`git status`).
4. Add a `docs/feedbacks/README.md` with one line per round. Round 1 has no file; point to BUILD_PLAN section 13, "Feedback round after the first listen/look".
5. Update the link at the top of [README.md](README.md) if needed (it should point to `docs/feedbacks/round-2.md`).

## Done when

- The root is clean.
- `docs/feedbacks/round-2.md` renders in VS Code preview with all images showing.
- Nothing from the original note is lost.
