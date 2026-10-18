# 04. Daily plan: a few games a day, one after another

## The rule (agreed with the developer)

- **The day's games:** each day a child gets **N games** (teacher setting; default **3**, range 1–6, plus "Tắt" = no plan, every game open as today).
- **One at a time, in order:** the child plays the day's games in a fixed order. Only the **next** game is open. "Finish a game" = **one set of 5**.
- **Choosing the N games:** least recently played first (`lastPlayed` null first, then the oldest day). Ties go to the lower level, then random. This keeps every game coming round.
- **Ordering them** (teacher setting):
  - **"Khởi động"** (warm-up, default): lowest level first, ascending by position index `(tier - 1) * STEPS_PER_TIER + step`. Ties are random. This keeps progress even across games, as the developer asked.
  - **"Ngẫu nhiên"**: shuffled.
- **Leaving mid-set:** the game stays the next one, so the others stay locked. No extra state is needed: a game is only "done" once its set is recorded.
- **Replay:** a game finished today can be replayed **for no credit**: no stars, no seed change, no streak effect, nothing added to `starsByDay`. Screen time still counts. The star screen shows the score but no stars, with a line such as "Chơi lại cho vui thôi nhé!". When all of today's games are done, all of them stay open for replay.
- **Games not in today's plan** stay locked all day.
- **Break and lock rules are unchanged.** A due break or lock still comes between sets, never mid-set.

## Core (pure): `src/core/dailyPlan.ts`

```ts
export interface DailyPlan { day: DayKey; games: GameId[]; done: GameId[] }
export function ensurePlan(p: Profile, s: Settings, today: DayKey, rng: Rng): DailyPlan   // same plan if p.plan.day === today
export function nextGame(plan: DailyPlan): GameId | null
export type TileState = "next" | "done" | "later" | "notToday" | "open";        // "open" when the plan is off
export function tileState(plan: DailyPlan | null, game: GameId): TileState
export function markDone(plan: DailyPlan, game: GameId): DailyPlan
```

- **Storage:**
  - `Profile.plan: DailyPlan | null` (new field; `repairProfile` fills `null`)
  - `Settings.daily: { gamesPerDay: number /* 0 = off */; order: "warmup" | "random" }`, with defaults in `defaultSettings()` and sanitised in `migrate()`
  - These are additive fields with defaults, so old saves load without a `SCHEMA` bump (the same precedent as `voicePack`). Add a storage test proving an old save gets the defaults.
- **The teacher changes N mid-day:** on the next home mount, rebuild the plan **keeping the games already done**, at the front and still done.
- **A game becomes "done" when its first set of the day is recorded:** in the play loop's finish step, next to `recordSet`. Only the plan's `next` game counts. A replay of a done game calls a new `recordPractice` (history only, `practice: true`), not `recordSet`.
- **Tests (`tests/dailyPlan.test.ts`):**
  - same plan all day
  - new plan the next day
  - least-recently-played choice
  - warm-up order
  - ties random but seeded
  - N changed mid-day keeps done games
  - plan off → every tile "open"
  - `markDone` of a non-next game does nothing
  - a replay gives no stars and leaves the seed alone

## UI

- **`home.ts` tiles**, by `tileState`:
  - **next**: bright, a gentle pulse under `fx-anim`, and a "Chơi tiếp" badge
  - **done**: a green ✓ badge; tapping opens a replay
  - **later**: greyed, with a padlock badge; tapping makes Mèo say **"Bé hoàn thành trò trước đã nhé!"** (toast + voice) and highlights the next tile
  - **notToday**: greyed, with a moon/calendar badge; tapping makes Mèo say **"Trò này sẽ mở vào hôm khác nhé!"**
  - **open**: as today
- **Router guard:** `#/play/<id>` for a game that is `later` or `notToday` goes home (so a typed URL can't skip ahead). The dev routes are unaffected.
- **Play screen:** knows whether this run is a replay (pass it in the route, e.g. `#/play/<id>?replay`, or decide from the plan at mount) and calls `recordPractice` instead of `recordSet`.
- **Star screen:** in replay mode, no stars pop; show the score and the practice line.
- **Teacher area, "Thời gian chơi" tab:** "Số trò mỗi ngày" (Tắt, 1…6) and "Thứ tự" (Khởi động / Ngẫu nhiên). The "Học sinh" tab shows each child's plan for today (✓ done, ▶ next).
- **New clips** (group "Chung"):
  - `plan_wait`: "Bé hoàn thành trò trước đã nhé!"
  - `plan_tomorrow`: "Trò này sẽ mở vào hôm khác nhé!"
  - `plan_replay`: "Chơi lại cho vui thôi nhé!"
  - `plan_all_done`: "Hôm nay em đã giải xong các vụ án rồi! Em có thể chơi lại cho vui."

  Then run `npm run audio:script`.

## ui:check

- **Existing sections** play any game freely. In the check's setup, set `settings.daily.gamesPerDay = 0` so they keep working.
- **A new section:**
  - plan of 3: only one tile open; tapping a locked tile gives the toast
  - finishing a set opens the next one
  - leaving mid-set keeps the same game next
  - replay gives no stars
  - the next day (fake clock, as the screen-time checks do) brings a new plan
  - the teacher setting changes the number of tiles open

## Done when

- With the defaults, a child sees one open tile and plays 3 games in warm-up order.
- After that, everything played today can be replayed for no credit.
- Tomorrow brings a new set of games.
