# Thám tử Toán học Tí hon — LearnMath1

An interactive web app of math mini-games for Vietnamese **grade 1** students (6 years old). Built for a small competition, with about 5 days of work (started 2026-10-17). The mascot is **Mèo Smarty**, and children play "detectives" solving cases (vụ án).

## Constraints

- **Frontend only.** No backend. All logic, question generation and scoring run in the browser. Data lives in `localStorage`. Hosting is static (GitHub Pages or Netlify).
- **Target devices:** iPad in landscape, desktop browsers, and (since round 2 of the teachers' feedback) phones in landscape; iPhone 15 and 15 Pro Max are the reference sizes. Portrait gets a "turn sideways" screen. The developer dislikes children using phones this way; the teachers asked for it, so keep it good but don't let it change the iPad design.
- **Layout:** a fixed 4:3 landscape stage (1180×820, matching the mockups), scaled to fit and letterboxed on desktop. On a short, wide screen (aspect ≥ 1.75 and under 600 px high: a phone sideways) the stage is **1240×600** (`body.wide`, `computeLayout()` in `ui/stage.ts`, `src/styles/wide.css`) with its own layout for every screen; controls must stay about 44 CSS px after scaling (about 68 stage px on an iPhone 15).
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
  - [docs/feedbacks/](../docs/feedbacks/README.md): the teachers' feedback rounds, with the decisions taken (round 2: [round-2.md](../docs/feedbacks/round-2.md)); [docs/tasks/](../docs/tasks/README.md): the work items of round 2, one file each.
- **Commands:** `npm run dev` · `npm test` · `npm run typecheck` · `npm run build` · `npm run audio:script` · `npm run ui:check` (real-browser checks; needs `npm run dev` running) · `npm run pwa:check` (offline/install checks on the built app; needs `npm run preview` on :4173) · `npm run desktop:build` (Windows .exe + installer via Tauri in `src-tauri/`; needs Rust; the iPad-sized window) · `npm run desktop:build:16x9` / `desktop:build:iphone15` / `desktop:build:all` (the same app in a 1600×900 or an 852×393 window, with their own app identity so the installers sit side by side) · `node scripts/guide-shots.mjs` then `node scripts/make-guide.mjs` (rebuild the user guide in `docs/guide/`)
- **Code map:**
  - `src/core/`: pure rules (difficulty, `SetRunner`, stars and streak, screen time, the daily plan, settings, PIN, profiles, storage)
  - `src/games/<id>/logic.ts` + `text.ts`: each game's generator, checker and Vietnamese lines
  - `src/i18n/`: number words and `say()`
  - `src/audio/`: clip manifest, voice, sound effects
  - `src/ui/`, `src/styles/`: the UI. The shared components are done and listed in docs/UI_GUIDE.md ("UI modules"); open `#/kit` in dev to see them. `styles/wide.css` is the phone layout; `ui/scene.ts` and `ui/tileArt.ts` draw the home tiles.
- **Conventions:**
  - **Purity:** `core/` and `games/` stay pure: no DOM, no timers, no storage, no `Math.random` (use the `Rng` passed in). Every rule change gets a test.
  - **Text:** children's text is built with `say()` from `src/audio/manifest.ts` clips, so text and voice match. A new spoken line means a new clip in the manifest, then `npm run audio:script`.
  - **Views:** UI views never decide right or wrong. They draw the question and submit an answer to `SetRunner`.
  - **Saves:** changing the saved data shape means bumping `SCHEMA` and adding a step in `migrate()`.
  - **Mockups:** `mockup/v2/` is the visual source of truth for the 1180×820 layouts of the first six games, a prototype only. Don't ship it, and don't edit it to change the app. It predates round 2 (merged and new games, the wide layout).

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
- **Daily plan:** each day a child gets a few games (the teacher sets how many in the teacher area, default 3, 0 = no plan, every game open) and plays them **one after another**; "finishing a game" is finishing one set of 5. Only the next game is open: a waiting game says "Bé hoàn thành trò trước đã nhé!", one that is not today's says "Trò này sẽ mở vào hôm khác nhé!". Which games: the least recently played, a tie goes to the lower level. In what order (teacher setting): **"Khởi động"** (default, lowest level first, so progress stays even across games) or **"Ngẫu nhiên"**. Leaving a set half-way changes nothing. A finished game can be replayed for no credit (no stars, no new level, no streak; screen time still counts). See `core/dailyPlan.ts` and docs/RULES.md.
- **Wrong answers:** Mèo Smarty gives a hint and the child gets one retry. Only first tries count toward the score.
- **Guide (i):** each game has an (i) button: a card of four spoken steps (voice reads each, the line being read is highlighted). It opens automatically the first time a profile opens that game. Rô-bốt and Thăng bằng also have "Xem Mèo làm mẫu", a ghost hand solving a sample question with voice (`src/ui/demo.ts`, `src/ui/games/demos.ts`); add a script there to give another game one. Some games are hard for 6-year-olds, so the guide matters.
- **Stars:**
  - Finishing a set earns ⭐ (effort).
  - 3/5 or better earns ⭐⭐.
  - 5/5 earns ⭐⭐⭐.
  - Stars add up to a running total.
- **Streak:** like Duolingo. At least 1 star in a day keeps the streak. Weekends should not break it (to be confirmed).
- **Screen time** (per profile, set in the teacher area, unlocked with a PIN):
  - session cap, e.g. 15 min, followed by a break screen
  - daily hard cap, e.g. 30 min, with a warning at 2 minutes left
  - inactivity: Mèo Smarty nudges at about 1 minute and pauses at about 3 minutes; idle time does not count toward the caps
  - never cut a child off mid-set
- **Voice:** a recording script made of reusable pieces (numbers 0–20, operators, prompts, praise, warnings), recorded by the teacher. Text-to-speech placeholder clips are allowed during development and use the same file names. No voice generation at runtime. The default placeholder is **Nam Minh** (Northern accent, asked for by the teachers); the teacher's own recordings win once complete. See docs/TTS_PILOT.md.

## Visual style

The teachers' feedback: keep the mockups' layout and colours, but make everything **more playful and cartoony**, because the current icons are too plain.

- Use one consistent open-licence cartoon icon set: Microsoft Fluent Emoji, MIT licence (`public/assets/emoji/`).
- Mèo Smarty is drawn in SVG (`ui/mascot.ts`; round 2 gave her a plaid deerstalker, a cape and a magnifier over one eye) and the scale is custom drawn. The home tiles are little **scenes built in code** (sky, drifting clouds, hills, swaying leaves, sparkles, a wooden title sign), not pictures; the teachers' picture mock-ups (AI-generated, `docs/feedbacks/round-2/`) are style references only.
- **Eye candy, switchable:** five effects, each a class on `<html>`:
  - `fx-anim`: motion
  - `fx-decor`: drifting background pictures
  - `fx-celebrate`: confetti and sparkles
  - `fx-sfx`: Web Audio sound effects, separate from the voice
  - `fx-music`: light background music (a lobby tune and one per game, composed by rules in `src/audio/music.ts`)
- **Presets:** Yên tĩnh (all off), Vừa phải (no decor), Rực rỡ (all on, the default). `prefers-reduced-motion` turns animation off.
- **All settings (effects, time limits) live only in the PIN-protected teacher area**, never on a child's screen, so children can't tamper with them. The PIN keeps children out; it is not real security. **The one exception is the sound mixer:** tapping the speaker mutes, holding it opens master, music, effects and voice volumes, which a child may change (anything the teacher switched off stays off).
- **Entry:** a small padlock in the bottom-right corner (homepage, break screens); hold about 1 s to open (`[data-adult-gate]`, `adultGate()` in `shared.js`), then PIN. No text links to the teacher area on children's screens.
- Children see fruit, baskets, vases, plates and, since round 2, a few gentle animals (a rabbit and a chick) **only when they are free in a garden or open nature**: never in cages, behind fences or in tanks, never carried between baskets, nothing scary, and the two kinds in one picture differ by shape, not only colour (motion is never used to tell them apart).

## Curriculum notes

- Aligned to the 2018 curriculum (Kết nối tri thức series).
- Zero is taught in Lesson 1 ("Các số 0–5"). Use 0 in every game.
- Lesson 5 is "Mấy và mấy" (splitting and joining numbers).
- It's October, so Tier 1 stays within 0–10.
- To confirm with the teachers: which textbook series they use and which week of lessons to target.

## Games: 6 tiles in a 3×2 grid

Original mockups are in `mockup/`; the clickable v2 mockups (Fluent Emoji, the first six games × 3 tiers) are in `mockup/v2/`. "An toàn số" (the third tile in the homepage mockup) has been **removed**. In round 2 "Cái cân" and "So sánh cân" were **merged** into "Thăng bằng", "Giỏ trái cây" became "Chia quả", "Tính theo hình" became "Giải mã hình", and **"Quy luật"** was added.

| # | Tile (id) | Core |
| --- | --- | --- |
| 1 | Thăng bằng (`scale`) | Vòng 1 balance the scale, Vòng 2 compare scales, Vòng 3 inference from clue scales |
| 2 | Rô-bốt (`robot`) | Arrow program on a grid |
| 3 | Chia quả (`basket`) | Move fruit between baskets: "Đưa cho Mèo X quả cam", "cần thêm", "bằng nhau" |
| 4 | Giải mã hình (`equations`) | Fruit values / one-unknown chains |
| 5 | Mấy và mấy (`split`) | Splitting and joining numbers |
| 6 | Quy luật (`pattern`) | Find the missing picture, number or cell of a pattern |

A game that is not ready shows a locked "Sắp ra mắt" (coming soon) card (`ready: false` in `src/games/index.ts`) so the grid still looks complete.

Build these once, in the shell: the drag/tap system, the number pad (0–20), the fruit-value key (Thăng bằng Vòng 1), the guide (i) replay helper, and the voice clip stitcher.

### 1. Thăng bằng

One game with three kinds of question (the old Cái cân and So sánh cân, merged). Game id `scale`; the teachers' "Vòng 4/5" are the hidden steps of Vòng 3.

- **Vòng 1, balance** (`games/scale/balance.ts`): add fruit from the tray until both pans weigh the same. Weights by kind: nho = 1, táo = 2, dưa hấu = 3; the fruit-value key is on screen from step 1. **Scoring:** the **total weight** is equal on both sides; many arrangements can be correct. Step 0 tips live, shows each pan's count and a >, < or = sign (grade 1 comparison symbols); from step 1 a padlock holds the beam level until "Xong".
- **Vòng 2, compare** (`compare.ts`): small scales compare same-sized gift boxes (the boxes are one picture recoloured, so real-world weight cannot give the answer away). Step 0 tap the heaviest of 3; step 1 heaviest or lightest of 4, sides flipped; step 2 put 3–4 boxes in order from light to heavy, scales shuffled. Show scales, not `<` symbols; no yes/no questions.
- **Vòng 3, inference** (`infer.ts`): two balanced clue scales say how fruit weigh in cam ("1 xoài = 3 cam"); the question scale has fruit on the left and an **empty right pan** the child fills with cam. Step 0: 2 of one kind; step 1: a mix (2 xoài + 1 táo); step 2: two chains (1 dưa hấu = 2 táo, 1 táo = 2 cam). Fruit only, whole numbers, the answer at most 10 cam, and a brute-force test proves each question has exactly one answer.
- **Look:** cartoon brass beam and pans, bead chains, wooden pedestal (drawn in SVG; `ui/games/scale/`).

### 2. Rô-bốt

- **Core, all tiers:** walls between squares and blocked squares. Levels are generated by code with a check that a path exists. Cells are square.
- **Variant C, Tier 2 and up, if time allows:** follow a number pattern (count by 1s, 2s, 10s; not odd/even). Correct squares light green, a wrong square lights red and the robot returns to the start. Tier 1 of this variant uses tap-to-trace instead of arrows.
- **Variant B, Tier 3, later:** "collect exactly 10" by passing over +/− squares, with a running total shown during the run. Not "find the best path".

### 3. Chia quả (was Giỏ trái cây)

- Fruit moves from the child's basket to Mèo's basket, by drag or tap-then-tap. Mèo Smarty says "Đưa cho Mèo X quả cam".
- **Exact count:** too many is also wrong, and children can drag fruit back.
- **Basket counts:** each basket shows a live count per fruit kind in **Vòng 1 only**. In Vòng 2 and 3 the counts are hidden so the child has to count; a live count on Mèo's basket would let them match the number without counting.
- **Progression:** a few fruit of one kind → many fruit of one kind with bags of 10 (Vòng 2) → Vòng 3: step 0 several kinds (or "không quả chuối"), step 1 **"cần thêm"** (Mèo has 5, wants 15: the child moves the fruit **and** types how many were added), step 2 **"bằng nhau"** (the baskets hold different amounts; make them equal; the end state is scored; fruit in rows of five). Mèo's own starting fruit is fixed. "Mèo has 2 more than you" was left out: too hard in October.
- **Large numbers:** use **bags of 10** ("túi 10 quả") to teach tens (chục).
- **Vòng 2 question bank deliberately teaches chục.** It mixes three kinds:
  - whole tens ("một chục / hai chục quả cam" → 1 or 2 bags; about a third or more of the questions)
  - the same amount by its other name ("mười quả cam" → 1 bag)
  - tens and ones ("mười ba quả cam" → 1 bag + 3)
- **Checking tens:** the child's basket always holds **2 to 9 loose fruit of a kind** (`MIN_LOOSE` / `MAX_LOOSE` in `basket/logic.ts`), never ten or more, so a chục can only come from a bag; a Vòng 2 basket also holds 2 bags. Success messages name the amount both ways ("Hai chục là 20 quả cam"), shown and spoken. The "10 loose oranges are accepted" branch (`looseTen`) stays in `check()` as a safety net but cannot happen in play.
- **Text panel:** always shown when sound is off; otherwise appears after the first wrong try (the child gets one retry, so "after 2" would only be the reveal). Always include a "nghe lại" (hear again) button.
- Teacher to confirm the Vietnamese counting words (quả cam, chùm nho?…).

### 4. Giải mã hình (was Tính theo hình)

- **Vòng 1:** substitution with the values shown, now with **several rows to fill at once** (2–3 rows, sums within 10): "cam = 1, táo = 2, chuối = 0; cam + táo = ?; chuối + táo = ?; cam + táo + chuối = ?". A retry keeps the rows that were right (green, locked) and clears only the wrong ones.
- **Vòng 2:** three-term sums, and reverse reasoning (🍎 + 🍎 = 2, so 🍎 = ?).
- **Vòng 3:** chains like 🍎🍎🍎 = 6, 🍎 + 🍐 = 3, 🍎 + 🍐 + 🍉 = 6.
- **No two fruits share a value**, in any tier (the teachers' rule).
- **Generator rule:** every step must have an equation with exactly one unknown. Never generate puzzles that need two equations solved together.
- Check that the answer is unique by trying every combination of values 0–10.
- Not locked; the tier system handles pacing.

### 5. Mấy và mấy

- **Tier 1:** a picture (a garden with a rabbit and a chick, a vase or a basket), with one blank (usually the total).
- **Tier 2:** pictures with the number bond (A on top, linked to B and C) beside them. Two blanks; 0 can appear.
- **Tier 3:** number bond only, with a missing part (`7 = 3 + ?`) and larger numbers.
- Sentences are read aloud. Each blank has a small picture of its item.
- Item kinds differ by shape, not just colour. Tap-to-mark helps children count.
- **The garden** (picked about half the time): animals free on a faded lawn, nothing in the backdrop that could be counted (no small flowers or fruit).
- The "build it from the description" version is **dropped**, because game 3 already covers it.

### 6. Quy luật (new in round 2)

- Find the missing picture, number or cell. **The rule of this game: only puzzles with exactly one answer**, proved in code for every generated question (`fittingOptions` in `games/pattern/logic.ts`, tested for every position × 300 seeds). Arbitrary or IQ-test-like puzzles (such as the dot grids of the teachers' reference) are not used.
- **Kinds:** repeating rows (AB, ABC, AAB, ABB, AABB; at least two full cycles plus one shown), number rows (+1, +2, +10, −1), a dot moving round the corners of a frame, and a 3×3 grid where each row and column has each outer and each inner shape once. Fruit and plain shapes only.
- **Tiers:** Vòng 1 repeating rows, blank at the end; Vòng 2 blank in the middle, number rows, AABB; Vòng 3 the rotating dot and the grid.
- The child taps a choice (or drags it onto the blank), then presses "Xong".

### Known mockup issues

- The homepage needs a 3×2 grid.
- The Cái cân footnote mentions number cards (0–10) that aren't drawn.
- The mockups do not show Thăng bằng (merged), Quy luật, the daily plan or the wide phone layout; the running app is the reference for those.
- The Rô-bốt grid rows have uneven heights.

## Open questions

- Streaks on weekends.
- Which textbook series and which week of lessons to target.
- Does the teacher need results from all students? If yes, consider export or QR rather than a backend.
- Licence for the icon set, under the competition's rules. (The home tiles and Mèo are now drawn in code, so only the Fluent Emoji remain.)
- Which animals the teachers prefer in Mấy và mấy (the developer chose a rabbit and a chick; white and brown rabbits drawn by hand were the teachers' wording).
