# Thám tử Toán học Tí hon — LearnMath1

An interactive web app of math mini-games for Vietnamese **grade 1** students (6 years old). Built for a small competition, with about 5 days of work (started 2026-10-17). The mascot is **Mèo Smarty**, and children play "detectives" solving cases (vụ án).

## Constraints

- **Frontend only.** No backend. All logic, question generation and scoring run in the browser. Data lives in `localStorage`. Hosting is static (GitHub Pages or Netlify).
- **Target devices:** iPad in landscape, and desktop browsers. Phones and portrait mode get a "turn sideways / use a tablet" screen.
- **Layout:** fixed 4:3 landscape stage (about 1180×820, matching the mockups), scaled to fit and letterboxed on desktop.
- **Language:** all text children see is Vietnamese. Code, identifiers and comments are in English.
- **Tap fallback:** every drag interaction also works as tap-the-item, then tap-the-target.
- **Installable (PWA):** home-screen install, partly to avoid Safari's 7-day `localStorage` eviction.

## Start here (code)

- **Stack:** Vite + TypeScript (strict), plain DOM with no framework, Vitest. No backend. Keep dependencies minimal: don't add a UI framework or libraries without asking.
- **Read first:**
  - [docs/BUILD_PLAN.md](../docs/BUILD_PLAN.md): ordered tasks with ☐/☑ status. Update it as steps finish.
  - [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md): folders, layers, how a set flows.
  - [docs/UI_GUIDE.md](../docs/UI_GUIDE.md): how to build screens from `mockup/v2/`.
  - [docs/RULES.md](../docs/RULES.md): every rule in plain words, with its constant in `src/core/config.ts`.
- **Commands:** `npm run dev` · `npm test` · `npm run typecheck` · `npm run build` · `npm run audio:script` · `npm run ui:check` (real-browser checks; needs `npm run dev` running) · `npm run pwa:check` (offline/install checks on the built app; needs `npm run preview` on :4173) · `npm run desktop:build` (Windows .exe + installer via Tauri in `src-tauri/`; needs Rust) · `node scripts/guide-shots.mjs` then `node scripts/make-guide.mjs` (rebuild the user guide in `docs/guide/`)
- **Code map:**
  - `src/core/`: pure rules (difficulty, `SetRunner`, stars and streak, screen time, settings, PIN, profiles, storage)
  - `src/games/<id>/logic.ts` + `text.ts`: each game's generator, checker and Vietnamese lines
  - `src/i18n/`: number words and `say()`
  - `src/audio/`: clip manifest, voice, sound effects
  - `src/ui/`, `src/styles/`: the UI. The shared components are done and listed in docs/UI_GUIDE.md ("UI modules"); open `#/kit` in dev to see them.
- **Conventions:**
  - **Purity:** `core/` and `games/` stay pure: no DOM, no timers, no storage, no `Math.random` (use the `Rng` passed in). Every rule change gets a test.
  - **Text:** children's text is built with `say()` from `src/audio/manifest.ts` clips, so text and voice match. A new spoken line means a new clip in the manifest, then `npm run audio:script`.
  - **Views:** UI views never decide right or wrong. They draw the question and submit an answer to `SetRunner`.
  - **Saves:** changing the saved data shape means bumping `SCHEMA` and adding a step in `migrate()`.
  - **Mockups:** `mockup/v2/` is the visual source of truth, a prototype only. Don't ship it, and don't edit it to change the app.

## Product rules (agreed so far)

- **Session:** a set of 5 questions per game.
- **Difficulty:** 3 visible tiers, "Vòng 1/2/3", with 2–3 hidden steps inside each tier.
  - Adapts during a session. A wrong answer adds a penalty: one extra correct answer is needed before promotion.
  - Tier 2 needs at least 2 correct answers before moving to Tier 3.
  - Two wrong answers in a row drop the child one tier.
  - Reaching Tier 3 is meant to be hard and to take several days. This is deliberate, to reward carefulness.
  - How this is enforced: inside a set the tier may rise at most one above the tier the set started at (`MAX_TIER_RISE_PER_SET`), and the start point moves only one hidden step per set, so starting in Vòng 3 takes at least 6 good sets. See docs/RULES.md.
  - Hidden steps come from per-game "knobs", not new content, for example:
    - number range: ≤5, ≤10, ≤20
    - position of the unknown: `3+2=?` is easier than `3+?=5`
    - pictures vs. digits
    - closer distractors
    - robot: path length, number of turns, obstacles
  - Seeding is **per set**: the next set starts from the previous set's result. 4/5 or better moves up one step, 1/5 or worse moves down one step. Given the time caps, expect about 1 set per game per day.
- **Wrong answers:** Mèo Smarty gives a hint and the child gets one retry. Only first tries count toward the score.
- **Guide (i):** each game has an (i) button: a card of four spoken steps (voice reads each, the line being read is highlighted). It opens automatically the first time a profile opens that game. Rô-bốt and Cái cân also have "Xem Mèo làm mẫu", a ghost hand solving a sample question with voice (`src/ui/demo.ts`, `src/ui/games/demos.ts`); add a script there to give another game one. Some games are hard for 6-year-olds, so the guide matters.
- **Stars:**
  - Finishing a set earns ⭐ (effort).
  - 3/5 or better earns ⭐⭐.
  - 5/5 earns ⭐⭐⭐.
  - Stars add up to a running total.
- **Streak:** like Duolingo. At least 1 star in a day keeps the streak. Weekends should not break it (to be confirmed).
- **Screen time** (per profile, set in the teacher area, unlocked with a PIN):
  - session cap, e.g. 15 min, followed by a break screen
  - daily hard cap, e.g. 30 min, with a warning at 2 minutes left
  - inactivity: Mèo Smarty nudges at about 20 s and pauses at about 60 s; idle time does not count toward the caps
  - never cut a child off mid-set
- **Voice:** a recording script made of reusable pieces (numbers 0–20, operators, prompts, praise, warnings), recorded by the teacher. Text-to-speech placeholder clips are allowed during development and use the same file names. No voice generation at runtime.

## Visual style

The teachers' feedback: keep the mockups' layout and colours, but make everything **more playful and cartoony**, because the current icons are too plain.
- Use one consistent open-licence cartoon icon set, proposed: Microsoft Fluent Emoji, MIT licence. Check the competition's rules on third-party art.
- Mèo Smarty and the scale stay custom drawn.
- **Eye candy, switchable:** four effects, each a class on `<html>`:
  - `fx-anim`: motion
  - `fx-decor`: drifting background pictures
  - `fx-celebrate`: confetti and sparkles
  - `fx-sfx`: Web Audio sound effects, separate from the voice
- **Presets:** Yên tĩnh (all off), Vừa phải (no decor), Rực rỡ (all on, the default). `prefers-reduced-motion` turns animation off.
- **All settings (effects, time limits) live only in the PIN-protected teacher area**, never on a child's screen, so children can't tamper with them. The PIN keeps children out; it is not real security.
- **Entry:** a small padlock in the bottom-right corner (homepage, break screens); hold about 1 s to open (`[data-adult-gate]`, `adultGate()` in `shared.js`), then PIN. No text links to the teacher area on children's screens.
- Children see fruit, baskets, vases and plates. **No animals** (no cages, no aquariums).

## Curriculum notes

- Aligned to the 2018 curriculum (Kết nối tri thức series).
- Zero is taught in Lesson 1 ("Các số 0–5"). Use 0 in every game.
- Lesson 5 is "Mấy và mấy" (splitting and joining numbers).
- It's October, so Tier 1 stays within 0–10.
- To confirm with the teachers: which textbook series they use and which week of lessons to target.

## Games: 6 tiles in a 3×2 grid

Original mockups are in `mockup/`; the clickable v2 mockups (Fluent Emoji, all 6 games × 3 tiers) are in `mockup/v2/`. "An toàn số" (the third tile in the homepage mockup) has been **removed**.

| # | Tile | Core | Build order | Effort |
| --- | --- | --- | --- | --- |
| 1 | Cái cân | Weighted objects | 4 | medium |
| 2 | Rô-bốt | Arrow program on a grid | 5 | highest |
| 3 | Giỏ trái cây (baskets) | "Đưa cho tôi X quả cam" | 3 | medium |
| 4 | Fruit equations | Fruit values / one-unknown chains | 2 | low–medium |
| 5 | Mấy và mấy | Splitting and joining numbers | 1, to prove the game contract | low |
| 6 | So sánh cân (scale comparisons) | Reasoning from scale comparisons | 6, stretch | low–medium |

If game 6 isn't ready, its tile shows a locked "Sắp ra mắt" (coming soon) card so the grid still looks complete.

Build these once, in the shell: the drag/tap system, the number pad (0–20), the fruit-value key (shared by games 1 and 4), the guide (i) replay helper, and the voice clip stitcher.

### 1. Cái cân
- **Weights by kind:** nho = 1, táo = 2, dưa hấu = 3. The fruit-value key is always on screen.
- **Later tier variant:** shapes, where tam giác = 3 and vuông/chữ nhật = 4.
- **Dropped:** weights by colour (an arbitrary rule).
- **Scoring:** check that the **total weight** is equal on both sides. Many arrangements can be correct. This settles mockup question D4-a.
- **Tiers:** in Tier 1 the scale tips live as items are added, shows each pan's count, and shows a >, < or = sign above the pivot (grade 1 comparison symbols). In Tier 2 and up a padlock holds it level until "Xong".
- **Look:** cartoon brass beam and pans, bead chains, wooden pedestal (drawn in SVG in `mockup/v2/scale.html`).

### 2. Rô-bốt
- **Core, all tiers:** walls between squares and blocked squares. Levels are generated by code with a check that a path exists. Cells are square.
- **Variant C, Tier 2 and up, if time allows:** follow a number pattern (count by 1s, 2s, 10s; not odd/even). Correct squares light green, a wrong square lights red and the robot returns to the start. Tier 1 of this variant uses tap-to-trace instead of arrows.
- **Variant B, Tier 3, later:** "collect exactly 10" by passing over +/− squares, with a running total shown during the run. Not "find the best path".

### 3. Giỏ trái cây
- Mèo Smarty says "Đưa cho tôi X quả cam"; the child drags fruit from one basket to the other.
- **Exact count:** too many is also wrong, and children can drag fruit back.
- **Basket counts:** each basket shows a live count per fruit kind in **Vòng 1 only** (`SHOW_COUNTS` in `basket.html`). In Vòng 2 and 3 the counts are hidden so the child has to count; a live count on Mèo's basket would let them match the number without counting.
- **Progression:** a few fruit of one kind → many fruit of one kind → several kinds of fruit.
- **Large numbers:** use **bags of 10** ("túi 10 quả") to teach tens (chục).
- **Vòng 2 question bank deliberately teaches chục.** It mixes three kinds:
  - whole tens ("một chục / hai chục quả cam" → 1 or 2 bags; about a third or more of the questions)
  - the same amount by its other name ("mười quả cam" → 1 bag)
  - tens and ones ("mười ba quả cam" → 1 bag + 3)
- **Checking tens:** the child's basket always holds **2 to 9 loose fruit of a kind** (`MIN_LOOSE` / `MAX_LOOSE` in `basket/logic.ts`), never ten or more, so a chục can only come from a bag; a Vòng 2 basket also holds 2 bags. Success messages name the amount both ways ("Hai chục là 20 quả cam"), shown and spoken. The "10 loose oranges are accepted" branch (`looseTen`) stays in `check()` as a safety net but cannot happen in play.
- **Text panel:** always shown when sound is off; otherwise appears after the first wrong try (the child gets one retry, so "after 2" would only be the reveal). Always include a "nghe lại" (hear again) button.
- Teacher to confirm the Vietnamese counting words (quả cam, chùm nho?…).

### 4. Fruit equations
- **Tier 1:** substitution with the values shown (🍎 = 1, so 🍎 + 🍎 = ?).
- **Tier 2:** three-term sums, and reverse reasoning (🍎 + 🍎 = 2, so 🍎 = ?).
- **Tier 3:** chains like 🍎🍎🍎 = 6, 🍎 + 🍐 = 3, 🍎 + 🍐 + 🍉 = 6.
- **Generator rule:** every step must have an equation with exactly one unknown. Never generate puzzles that need two equations solved together.
- Check that the answer is unique by trying every combination of values 0–10.
- Not locked; the tier system handles pacing.

### 5. Mấy và mấy
- **Tier 1:** a picture vase or basket, with one blank (usually the total).
- **Tier 2:** pictures with the number bond (A on top, linked to B and C) beside them. Two blanks; 0 can appear.
- **Tier 3:** number bond only, with a missing part (`7 = 3 + ?`) and larger numbers.
- Sentences are read aloud. Each blank has a small picture of its item.
- Item kinds differ by shape, not just colour. Tap-to-mark helps children count.
- The "build it from the description" version is **dropped**, because game 3 already covers it.

### 6. So sánh cân (stretch)
- Small scale pictures show comparisons (A < B, B < C), and the child works out the missing comparison.
- Use similar-sized items so real-world weight doesn't give the answer away. Show scales, not `<` symbols.
- Answer by "tap the heaviest" out of 3, or by ordering items from light to heavy. No yes/no questions.
- **Tiers:** 3 items / 2 scales → 4 items / 3 scales → one scale shown the other way round.

### Known mockup issues
- The homepage needs a 3×2 grid.
- The Cái cân footnote mentions number cards (0–10) that aren't drawn.
- The Rô-bốt grid rows have uneven heights.

## Open questions

- Streaks on weekends.
- Which textbook series and which week of lessons to target.
- Does the teacher need results from all students? If yes, consider export or QR rather than a backend.
- Licence for the icon set, under the competition's rules.
