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

- **Only active time counts.** After 20 s without a touch, Mèo nudges. After 60 s the game pauses, and idle time is never counted.
- **Session limit (15 min):** a break becomes **due** (`breakDue`). The shell starts the break only **after the current set ends**. The break lasts 5 min.
- **Daily limit (30 min):** a warning plays 2 min before the limit. At the limit a lock becomes due (`lockDue`), applied after the current set. The app stays locked until the next day, unless an adult enters the PIN and grants extra time (`grantBonus`) or ends a break early (`endBreak`).

## Settings and the teacher area

- **Location:** every setting lives only in the teacher area. That covers effects, time limits, weekend streaks and the PIN.
- **Getting in:** the teacher area opens from a padlock that must be **held for about 1 s**, followed by the PIN.
- **Default PIN:** `1234` (`DEFAULT_PIN`). The teacher area should ask for it to be changed.
- **What the PIN is:** it keeps children out. It is not real security: everything is stored in the browser.
- **Effects:** four switches (`Fx` in [settings.ts](../src/core/settings.ts)):

  | Switch | Controls |
  | --- | --- |
  | `anim` | motion |
  | `decor` | background pictures |
  | `celebrate` | confetti and sparkles |
  | `sfx` | sound effects |

  There are three presets: **Yên tĩnh** (all off), **Vừa phải** (no background pictures) and **Rực rỡ** (all on, the default). If the device asks for reduced motion, the first run starts with `anim` off.
- **Speaker button:** it only toggles `muted`, which mutes voice and sound effects. It is the one setting children may change.

## Game rules

These live in the logic files. Details are in [Games_Description_EN.md](../Games_Description_EN.md).

| Game | Rule | Code |
| --- | --- | --- |
| Cái cân | Balanced = equal **total weight** (grapes 1, apple 2, watermelon 3). Many arrangements can be correct. Vòng 1 tips live and shows counts plus the >, <, = sign; Vòng 2+ is held by a padlock until "Xong". | [scale/logic.ts](../src/games/scale/logic.ts) |
| Rô-bốt | The program must end on the flag without hitting a wall, a block or the edge. Levels are generated with a guaranteed path; from Vòng 2 they force a detour. At most 12 steps. | [robot/logic.ts](../src/games/robot/logic.ts) |
| Giỏ trái cây | Exact count per kind (too many is wrong). Vòng 2 deliberately mixes whole tens, "mười" and tens + ones. The child's basket always holds 2–9 loose fruit of a kind, so a chục can only come from a bag. Counts on the baskets appear in Vòng 1 only. The request is also shown as numbers with pictures ("3 🍊"; in Vòng 2 also "[10] + 3 🍊") when the sound is off, or after the first wrong try. After a correct Vòng 2 answer Mèo says the amount both ways. | [basket/logic.ts](../src/games/basket/logic.ts) |
| Tính theo hình | Every puzzle can be solved one clue at a time, has exactly one answer, stays within 20, and never asks what a clue already states. | [equations/logic.ts](../src/games/equations/logic.ts) |
| Mấy và mấy | Vòng 1: picture, total blank. Vòng 2: picture plus number bond, two part blanks, 0 possible. Vòng 3: number bond only, one missing part, up to 20. | [split/logic.ts](../src/games/split/logic.ts) |
| So sánh cân | Neighbouring pairs in the hidden order give exactly enough clues. Vòng 2+ flips sides; Vòng 3 also shuffles the scales. The child taps the heaviest or lightest, or orders all boxes. | [compare/logic.ts](../src/games/compare/logic.ts) |
