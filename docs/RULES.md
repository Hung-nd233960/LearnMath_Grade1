# Rules

This file lists every product rule in plain words, with where it lives in code. The numbers are in [src/core/config.ts](../src/core/config.ts). If you change a rule, change the constant there, update this file, and keep the tests green.

## A set

- A **set** is 5 questions of one game (`SET_LENGTH`).
- **Wrong answers:** a wrong first try gets a hint, then **one retry** (`RETRIES_PER_QUESTION`). After that, the answer is revealed and the set moves on.
- **Score:** only **first tries** count toward the score. Retries are for learning.
- **Code:** `SetRunner` in [session.ts](../src/core/session.ts). Each answer gives one of four outcomes:

  | Outcome | Meaning |
  | --- | --- |
  | `correct` | right on the first try |
  | `retry` | wrong; show the hint and allow another try |
  | `correctOnRetry` | right on the retry |
  | `reveal` | wrong again; show the answer and move on |

## Difficulty

Code: [difficulty.ts](../src/core/difficulty.ts).

**Positions.** There are 3 visible tiers ("Vòng 1/2/3"), each with 3 hidden steps (`STEPS_PER_TIER`). That makes 9 positions, numbered 0–8.

**Inside a set**, the difficulty changes after each first try:

| Event | Effect |
| --- | --- |
| Correct | Count it toward moving up. If enough are counted, move up one tier (to step 0). Otherwise move up one step inside the tier. |
| Tier 1 → 2 | Needs 1 correct (`PROMOTE_NEED[1]`). |
| Tier 2 → 3 | Needs 2 correct (`PROMOTE_NEED[2]`): "Vòng 2 always has at least 2 questions". |
| Wrong | The count resets. The child owes **1 extra** correct answer at this tier (`MISTAKE_DEBT`), the "careful" penalty. Move down one step. |
| 2 wrong in a row | Drop one tier, to that tier's top step (`DEMOTE_AFTER_WRONG_IN_A_ROW`). |
| Any | The tier can rise at most **1 above the tier the set started at** (`MAX_TIER_RISE_PER_SET`). |

**Between sets**, each game's starting point (its seed) moves one hidden step:

| Set score | Next set starts |
| --- | --- |
| 4 or 5 (`SEED_UP_SCORE`) | one step up |
| 0 or 1 (`SEED_DOWN_SCORE`) | one step down |
| otherwise | at the same place |

The seed is saved per game, per child.

**How the two levels fit together.** The rules above only cap in-set movement at one tier. They do not, by themselves, make reaching Vòng 3 take several days, which the teachers want. What does it is the slow seed: going from Vòng 1 to *starting* in Vòng 3 takes at least **6 good sets**. A strong child still *visits* the next tier inside a set, so every set feels challenging.

## Stars and streak

Code: [rewards.ts](../src/core/rewards.ts) and [profiles.ts](../src/core/profiles.ts).

**Stars per set:**

| Result | Stars |
| --- | --- |
| Finished the set (effort) | 1 ⭐ |
| Score 3 or more | 2 ⭐⭐ |
| Score 5 | 3 ⭐⭐⭐ |

**Streak:**
- At least 1 star in a day keeps the streak going.
- With `skipWeekends` on (the default; teachers can turn it off), Saturdays and Sundays without play do not break it.
- The homepage shows the streak with `currentStreak`. It shows 0 once a required day has been missed.

## Screen time

Code: [screentime.ts](../src/core/screentime.ts). Defaults are in `DEFAULT_LIMITS`; teachers change them per device.

- **Applied between sets.** A due break or lock replaces the home screen and the start of a new set, and is shown as soon as the child is on home. The set in progress and the star screen are never interrupted. Another child can take over from a break or lock screen ("Bạn khác chơi"); each child has their own clock.
- **Only active time counts.** After **1 minute** without a touch, Mèo nudges. After **3 minutes** the game pauses and the music fades out, and idle time is never counted. (A save still holding the first release's 20 s / 60 s is moved to these on load.)
- **Session limit (15 min):** a break becomes **due** (`breakDue`). The shell starts the break only **after the current set ends**. The break lasts 5 min.
- **Daily limit (30 min):** a warning plays 2 min before the limit. At the limit a lock becomes due (`lockDue`), applied after the current set. The app stays locked until the next day, unless an adult enters the PIN and grants extra time (`grantBonus`) or ends a break early (`endBreak`).

## The daily plan

Code: [dailyPlan.ts](../src/core/dailyPlan.ts) (pure), settings `Settings.daily` in [settings.ts](../src/core/settings.ts), `Profile.plan`.

- **How many:** the teacher chooses 0–6 games a day (default **3**; 0 = no plan, every game is open as before) and an order, per device.
- **Which games:** the **least recently played** (never played first); a tie goes to the **lower level** (position index `(tier − 1) × 3 + step`), then to chance. Games that are not ready are never planned.
- **In what order:** **"Khởi động"** (default): lowest level first, so progress stays even across games (ties by chance); or **"Ngẫu nhiên"**: shuffled.
- **One at a time:** only the next game is open. "Finishing a game" is **one set of 5** being recorded; leaving a set half-way changes nothing. A waiting game says "Bé hoàn thành trò trước đã nhé!", a game that is not today's says "Trò này sẽ mở vào hôm khác nhé!", and typing a locked game's address leads back to home.
- **One plan a day:** it is made the first time it is needed and kept all day. If the teacher changes the number during the day, games already played keep their place: more games are added at the end, fewer ones drop from the end (finished ones always stay). A new day makes a new plan.
- **Replay:** a finished game can be played again for no credit (`recordPractice`: the history only, with `practice: true`; no stars, no new level, no streak, `lastPlayed` unchanged; screen time still counts). When all of today's games are done they stay open for replay; games outside the plan stay locked all day.

## Settings and the teacher area

- **Location:** every setting lives only in the teacher area. That covers effects, time limits, weekend streaks and the PIN.
- **Getting in:** the teacher area opens from a padlock that must be **held for about 1 s**, followed by the PIN.
- **Default PIN:** `1234` (`DEFAULT_PIN`). The teacher area shows a bar asking for it to be changed until it is. It is not shown anywhere on a child's screen; if it is forgotten, clearing the site data resets it (and the progress, so export first).
- **Staying open:** after the PIN the area stays open while it is used, and closes after `TEACHER_UNLOCK_MINUTES` (30) without a touch. Leaving it (back button, "Khoá lại") locks it at once.
- **Guessing:** 5 wrong codes in a row make the pad wait 30 s (`PIN_TRIES`, `PIN_WAIT_MS` in [teacher.ts](../src/core/teacher.ts)).
- **Changing today's time:** in the teacher area an adult can add 10 or 20 minutes for the child who is playing (this also ends a lock or an early stop), **take 10 or 20 minutes away** (to undo a misclick; the limit never goes below zero, and never more than 240 extra minutes), end a break early, or press **"Cho bé [tên] nghỉ sớm"**, which ends the day for that child at once: the "done for today" screen shows when the child next goes home or starts a set (never in the middle of one), and it lasts until tomorrow unless an adult adds time. Code: `changeBonus`, `lockEarly` in [screentime.ts](../src/core/screentime.ts).
- **Daily plan:** the "Thời gian chơi" tab has the number of games a day (Tắt, 1–6) and their order; the "Học sinh" tab shows each child's plan for today.
- **Sliders:** session 5–30 min, break 2–10 min, daily 10–60 min, idle nudge 10–120 s, default 60 (the pause is 3× the nudge).
- **What the PIN is:** it keeps children out. It is not real security: everything is stored in the browser.
- **Voice:** the teacher chooses the voice pack (the device's own voice, the teacher's recordings, or another pack folder). With no choice the first *complete* pack is used; a missing clip falls back to the device voice for that sentence.
- **Effects:** five switches (`Fx` in [settings.ts](../src/core/settings.ts)):

  | Switch | Controls |
  | --- | --- |
  | `anim` | motion |
  | `decor` | background pictures |
  | `celebrate` | confetti and sparkles |
  | `sfx` | sound effects |
  | `music` | background music |

  There are three presets: **Yên tĩnh** (all off, so no music either), **Vừa phải** (no background pictures) and **Rực rỡ** (all on, the default). If the device asks for reduced motion, the first run starts with `anim` off.
- **Speaker button:** a **tap** toggles `muted`, which silences the voice, the sound effects and the music. **Holding** it (about 0.6 s) opens the **sound mixer**: master, background music, sound effects and Mèo's voice, each with an on/off switch and a volume (`settings.mix`; `channelVolume()` in [settings.ts](../src/core/settings.ts) combines master × channel × switch). These are the only settings children may change. What the teacher switched off in the Effects tab (music, sound effects) stays off and shows greyed out in the mixer.
- **Music:** one bright, light tune in the lobby (home, who, stars) and one for each of the six games; none in the teacher area, on the break screen or the "done for today" screen. It ducks to 30% while Mèo speaks and fades out when the game pauses for inactivity. The tunes are composed by rules, not recorded ([music.ts](../src/audio/music.ts)), so there are no files and no licences.

## Game rules

These live in the logic files. Details are in [Games_Description_EN.md](../Games_Description_EN.md).

| Game | Rule | Code |
| --- | --- | --- |
| Thăng bằng | **Vòng 1, balance:** balanced = equal **total weight** (grapes 1, apple 2, watermelon 3); many arrangements are right. Step 0 tips live and shows counts plus the >, <, = sign; steps 1–2 hold the beam level with a padlock until "Xong". **Vòng 2, compare:** neighbouring pairs in the hidden order give exactly enough clues; step 0 taps the heaviest of 3, step 1 the heaviest or lightest of 4 with sides flipped, step 2 orders 3–4 boxes with the scales shuffled. **Vòng 3, inference:** clue scales balance in whole cam (never shown as numbers), the child puts cam on the empty pan; step 0 two of one kind, step 1 a mix of two kinds, step 2 two chains; the answer is at most 10 and exactly one answer fits (brute-force tested). | [scale/balance.ts](../src/games/scale/balance.ts), [compare.ts](../src/games/scale/compare.ts), [infer.ts](../src/games/scale/infer.ts) |
| Rô-bốt | The program must end on the flag without hitting a wall, a block or the edge. Levels are generated with a guaranteed path; from Vòng 2 they force a detour. At most 12 steps. | [robot/logic.ts](../src/games/robot/logic.ts) |
| Chia quả | **give** (Vòng 1–2, Vòng 3 step 0): exact count per kind (too many is wrong). Vòng 2 deliberately mixes whole tens, "mười" and tens + ones. The child's basket always holds 2–9 loose fruit of a kind, so a chục can only come from a bag. Counts on the baskets appear in Vòng 1 only. The request is also shown as numbers with pictures when the sound is off, or after the first wrong try. After a correct Vòng 2 answer Mèo says the amount both ways. **addTo** (Vòng 3 step 1): Mèo already has 1–9 and wants a total of at most 20; the fruit must reach the total **and** the child must type how many they added (amounts are checked first); ten or more needed means a bag, so oranges. **equalize** (Vòng 3 step 2): the child holds Mèo's amount + 2 × the moves (4–9 loose), only the end state counts. Mèo's own starting fruit cannot be moved. | [basket/logic.ts](../src/games/basket/logic.ts) |
| Giải mã hình | Every puzzle can be solved one clue at a time, has exactly one answer, stays within 20, and never asks what a clue already states. No two fruits share a value. Vòng 1 has 2–3 rows to fill (all values shown, sums within 10, a fruit may be worth 0 from step 1); tiers 2–3 have one row. | [equations/logic.ts](../src/games/equations/logic.ts) |
| Mấy và mấy | Vòng 1: picture, total blank. Vòng 2: picture plus number bond, two part blanks, 0 possible. Vòng 3: number bond only, one missing part, up to 20. The picture is a garden (about half the time; a rabbit and a chick, free on a lawn), a vase or a basket; the two kinds always differ by shape. | [split/logic.ts](../src/games/split/logic.ts) |
| Quy luật | **Only puzzles with exactly one answer**: every generated question is checked by trying each option (`fittingOptions`) and exactly one fits. Repeating rows (the unit is never itself a repeat; two full cycles plus one shown), number rows (+1, +2, +10, −1; 0–20, tens up to 100), a dot moving round a frame, a 3×3 grid (each row and column has each outer and inner shape once). Vòng 1 repeat, blank at the end; Vòng 2 blank in the middle, numbers, AABB; Vòng 3 rotation and the grid. | [pattern/logic.ts](../src/games/pattern/logic.ts) |
