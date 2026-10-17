# UI guide

This guide explains how to build the screens on top of the finished logic. Read [ARCHITECTURE.md](ARCHITECTURE.md) first.

**The visual source of truth is the clickable mockup in [mockup/v2/](../mockup/v2/).** Port its look; do not redesign. Its code is a prototype and may be reused freely, but rewrite it as typed modules.

## Ground rules

1. **No game rules in the UI.** A view draws `Q` and returns `A`.
   - Right or wrong comes from `SetRunner.answer()`.
   - Hints come from `text.hint(result)`.
   - The next question comes from `runner.next()`.
2. **Children's text comes from `say()` / `text.ts`**, so the voice matches.
   - Fixed UI labels go in one table, `src/i18n/ui.ts` (create it), for example `STR.done = "Xong"`.
   - Never hard-code Vietnamese inside view logic.
3. **Children never see settings.** The only control they get is the speaker (mute) button. Everything else lives in the teacher area, behind the padlock and PIN.
4. **Every drag also works as tap-then-tap.** Use the shared `dragTap`.
5. **Don't break tests or typing.** Keep `npm test` and `npm run typecheck` green after each step.

## Stage and layout

- **Fixed stage:** everything is drawn on a **1180 × 820** stage, scaled to fit with `transform: scale()` and letterboxed. Use px inside the stage.
- **Portrait or phone:** show the "xoay ngang máy" notice instead. Port `fitStage()` and `#rotate` from `mockup/v2/shared.js`.
- **Top bar layout:** back button left; "Vòng N" + 5 dots centre; (i) + speaker right.
- **Touch targets:** at least **56 stage-px**. Draggable items are about 58–60 px.
- **Fonts:** **Baloo 2** for headings, buttons and numbers; **Be Vietnam Pro** for body text. Both are loaded in `index.html`.

## Styles

Port `mockup/v2/shared.css` into `src/styles/`:

| File | Contents |
| --- | --- |
| `tokens.css` | `:root` colours: navy, green, the per-game `--*-bg` / `--*-tile` (names used by `GAMES[].bgVar/tileVar`), shadows |
| `base.css` | reset, `.stage`, polka-dot texture, `#rotate` |
| `components.css` | `.btn-round`, `.btn-primary/secondary`, `.card`, `.prompt`, `.dots`, `.tier-badge`, `.numpad`, `.answer-box`, `.overlay`, `.bubble`, `.gate-btn`, switches |
| `fx.css` | everything behind `.fx-anim`, `.fx-decor`, `.fx-celebrate` (copy the "Eye candy" block) |

Per-game styles can live next to each view, as `src/ui/games/<id>.css` imported by the view.

The shell sets classes on `<html>` from `settings.fx`: `fx-anim`, `fx-decor`, `fx-celebrate`, `fx-sfx`. Effects must look right with **each switch on or off**, especially "Yên tĩnh" (all off).

## UI modules (src/ui/) — built in step 1

All of these exist and are tested. Use them; don't re-implement. Anything that listens for events returns a **cleanup function**; call it when the screen goes away (a screen's `mount` returns it, and the router calls it on navigation).

| Module | What it gives you |
| --- | --- |
| `context.ts` | `AppContext`: `{ store, voice, sfx, stage, go(path), now(), today() }`, passed to every screen. Use `ctx.now()` / `ctx.today()`, never `Date`. |
| `app.ts` | `startApp(host)`. Builds the context, applies `settings` to the page (`fx-*` and `is-muted` classes on `<html>`, `sfx` / `voice` flags), unlocks audio on the first touch, handles the speaker button (toggles `settings.muted`) and the tap sound. **Add each new screen to the `SCREENS` table here.** In dev, `window.__app` is the context. |
| `router.ts` | Hash routes. A screen is a `ScreenDef`: `{ mount({ ctx, screen, params }) → cleanup, bg?, decor? }`. `bg` is a CSS variable name (`"--scale-bg"`) or a colour; `decor` picks the background pictures (default = the route name, `null` = none). `RouterOptions.guard` redirects (use it for "no profile chosen → who"). `parseRoute` is pure and tested. |
| `stage.ts` | `createStage(host)`: the 1180×820 stage, scaled to fit, plus the portrait notice. `stage.el` is where overlays go. Also `STAGE_W`, `STAGE_H`, `computeScale`, `isPortrait`. |
| `dom.ts` | `h(tag, attrs, ...children)`, `html(staticMarkup)`, `$`, `$$`, `clear`, `emoji(name, size)`, `emojiSrc(name)`, `Cleanup`. In `h`, `onclick: fn` adds a listener and `"data-x": true` sets an empty attribute. |
| `icons.ts` | `ICON` (back, sound, mute, replay, check) and `ARROW` (U, D, L, R) as SVG strings. |
| `mascot.ts` | `mascot(mood)` → `<div class="meo">` (moods: normal, happy, think, sleep, detective); `setMood(el, mood)`. Size it with CSS on `.meo`. |
| `svgDefs.ts` | Gradients `#brass`, `#brassV`, `#bowlG`, `#wood`, `#ceramic` for `fill="url(#brass)"`. Already injected by `startApp`. |
| `topbar.ts` | `topbar({ tier, index, length, onBack, onInfo? })` → `{ el, setProgress(tier, index, length) }`. Also `speakerButton()` (use it on the home screen too) and `backButton()`. |
| `overlay.ts` | `showFeedback(stage.el, { kind: "correct" or "retry" or "reveal", title, message?, stars?, button?, onClose? })` (plays the win/oops sound, confetti on correct), `showGuide(stage.el, steps: Speech[], { voice?, onStep?, onClose? })` (reads each step aloud and marks it; the play screen opens it by itself the first time), `openOverlay(stage.el, card, onClose?)`. Any element inside with `data-close` closes it. |
| `effects.ts` | `confetti(stage.el)`, `sparkle(stage.el, element, count?, distance?)`. Both do nothing when "Pháo hoa" is off. |
| `fx.ts` | `fxOn("anim" / "decor" / "celebrate" / "sfx")`: reads the class on `<html>`. |
| `dragTap.ts` | `dragTap({ root: screen, onMove(item, zone) })` → cleanup. Items have `data-item` (fixed ones also `data-fixed`), places have `data-zone`. You move the element in `onMove`. Plays pick/drop sounds and sparkles on drop. |
| `numpad.ts` | `createNumpad(container, { scope: screen, maxDigits?, onChange? })` → `{ activate(box), dispose }`. Builds 1–9, 0, xoá; `.answer-box` elements inside `scope` receive the digits (keyboard digits too). Read a box with `boxValue(box)`; set with `setBox(box, "12")`. |
| `adultGate.ts` | `mountAdultGate(parent, onOpen)` → cleanup. The padlock: hold about a second to call `onOpen` (navigate to `teacher`); a quick tap only shows the hint. |
| `decor.ts` | `mountDecor(screen, key)`: called by the router; you only edit the `DECOR_SETS` table for a new screen. |
| `avatars.ts` | `avatarBadge(stem, size)`: a round picture on a soft colour; `avatarColor(stem)`. |
| `paginate.ts` | `paginate(items, perPage)` and `clampPage` (pure, tested). |
| `screens/who.ts`, `screens/home.ts` | The picker and the home screen (step 2). Good examples of how a screen is written: `mount({ ctx, screen })`, build with `h()`, return a cleanup. |
| `screens/play.ts` | The generic play loop (`#/play/<id>`). Read it to see how `SetRunner`, a view, `text.prompt/hint`, the feedback card and `recordSet` fit together. Don't put game rules here. |
| `screens/stars.ts` | End-of-set screen; reads `ctx.lastSet` (set by `play.ts`, cleared when you leave). |
| `screens/dev.ts` | Dev-only `#/dev/<id>/<tier>/<step>/<seed>`: one deterministic question + a "Giải" button. |
| `games/types.ts`, `games/index.ts` | The `GameView` contract and the `VIEWS` registry. |
| `timekeeper.ts`, `notices.ts`, `screens/break.ts`, `screens/locked.ts` | Screen time. `ctx.time` is the clock (`snapshot()`, `dailyLeftMs()`, `gate(route)`, `ensureBreak()`, `grantBonus(min)`, `endBreak()`, `subscribe(fn)`); the router guard in `app.ts` applies a due break or lock to `home` and `play`. Add a new counting screen to `COUNTING_ROUTES`. |
| `games/compare.ts` | The So sánh cân screen: mini scales from `Weighing`s, single-pick vs order modes, a row of slots where `reset` keeps the correct prefix (uses `fb.result.data.firstWrong`). |
| `games/robot.ts` | The Rô-bốt screen: an animated result in `playResult` driven by `simulate()`, a program the child edits, `reveal` that fills and walks the solution, and a document-level key listener removed in `unmount`. |
| `games/scale.ts` | The Cái cân screen: live tilt vs the padlock, fixed vs movable items, `playResult` that animates the outcome and `reset` that re-locks. |
| `games/basket.ts`, `games/art.ts` | The Giỏ trái cây screen: the model for views that draw their own prompt (`ownPrompt`), move items with `dragTap`, and react to wrong tries / the mute switch. `art.ts` holds SVG drawings shared by several games. |
| `games/equations.ts` | The Tính theo hình screen (second game screen; simpler than split, a good second example). |
| `games/split.ts`, `games/bond.ts`, `games/splitLayout.ts` | The first game screen (Mấy và mấy): the model for the others. `bond.ts` is the number-bond widget; `splitLayout.ts` is pure and tested. |
| `screens/addProfile.ts` | `openAddProfile(ctx, onAdded)`: the "Thêm bạn mới" form (name + picture); `openEditProfile(ctx, profile, onSaved)` reuses it to rename a child. |
| `audio/packs.ts`, `audio/voice.ts` | Voice packs: `choosePack(selected, packs)` decides the folder (the teacher's choice, else the first complete pack, else `"device"`); `voice.setPack(id)` applies it (`applySettings` in `app.ts` does so on every settings change); `voice.play(speech, pack?, force?)` can audition another pack. `ctx.voicePacks` holds the list read from `audio/packs.json`. |
| `demo.ts`, `games/demos.ts` | "Xem Mèo làm mẫu": `runDemo(ctx, game, onClose)` plays a worked example on a fixed sample question in a layer over the play screen (own copy of the view, ghost hand, captions, voice; nothing scored). `hasDemo(game)` says whether a game has one. `demos.ts` holds each game's script (what to tap, what Mèo says), with no DOM code so it can be tested. |
| `screens/teacher.ts`, `pinPad.ts`, `teacherSession.ts` | The teacher area. `createPinPad(onComplete)` is the 4-digit entry (gate and change-PIN); `teacherSession` remembers the unlock. Add a new setting as a row in one of the four tabs; it must go through `ctx.store.update` so the page reacts at once. |
| `screens/kit.ts` | Dev-only gallery at `#/kit`: every component above on one screen (not in production builds). Open it to see how they look and work. |

Also: `src/i18n/ui.ts` holds fixed button and notice texts as `STR` (add new ones there). `src/styles/` has `tokens.css`, `base.css`, `components.css` and `fx.css`; add per-screen CSS next to the screen (`import "./home.css"`) and use the tokens.

**Testing the UI.** Run `npm run dev`, then in another terminal `npm run ui:check`. It drives headless Chrome with real mouse events and checks the foundation through `#/kit`. Add checks for each screen you build. Vitest (`npm test`) covers the pure parts only (no DOM).

## Routes and screens (src/ui/screens/)

| Route | Screen | Mockup | Notes |
| --- | --- | --- | --- |
| `#/who` | profiles | profiles.html | Shown when there is no active profile. A tap sets the active profile **and calls `voice.unlock()`**. |
| `#/home` | home | index.html | Real data: `streakToday`, `starsToday`, `weekStrip`, tiles from `GAMES` showing `Vòng {seed.tier}` and `bestStars`. Tiles with `ready: false` show "Sắp ra mắt". Padlock bottom-right. |
| `#/play/<id>` | game | scale/robot/… .html | **Exists (step 3).** The generic play loop plus the game's view; a game with no view goes home. |
| `#/stars` | end of set | — (new) | **Exists (step 3).** Stars earned (1–3, animated), score "4/5", streak, Mèo happy, a "Về trang chủ" button. |
| `#/break` | break | break.html v=1 | Countdown from `breakLeftMs`; padlock (an adult can end the break). |
| `#/locked` | done for today | break.html v=2 | Night style, stars today, padlock. |
| `#/teacher` | teacher area | teacher.html | PIN gate (`checkPin`) → tabs: Hiệu ứng, Thời gian chơi, Học sinh, Sao lưu. Also: change PIN, add/rename/remove profiles, "+10/+20 phút" (`grantBonus`), end break (`endBreak`). Unlock expires after `TEACHER_UNLOCK_MINUTES`. |
| `#/kit` | component gallery | — | Exists (step 1), dev only. |
| `#/dev/<id>/<tier>/<step>/<seed>` | dev preview | mockbar "Xem vòng" | **Exists (step 3).** Renders one question deterministically for review and screenshots. Only when `import.meta.env.DEV`. |

## Game views (src/ui/games/<id>.ts)

Implement this interface (put it in `src/ui/games/types.ts`):

```ts
export interface GameViewApi<A> {
  submit(answer: A): void;   // child pressed Xong / Chạy!
  pos: Position;             // tier decides e.g. live tilt, counts, key
  fx: Fx;                    // to skip animations when fx.anim is off
  speak(s: Speech): void;
  sfx: typeof sfx;
}
export interface GameView<Q, A> {
  mount(el: HTMLElement, q: Q, api: GameViewApi<A>): void;
  /** Animate the result before feedback: tilt the scale, walk the robot, light cells. */
  playResult?(fb: AnswerFeedback): Promise<void>;
  /** Show a correct answer (outcome "reveal"); `answer` comes from runner.solution(). */
  reveal?(answer: A): Promise<void>;
  /** On "retry": restore an editable state (e.g. robot back to start, keep the program). */
  reset?(): void;
  unmount(): void;
}
```

Per game, the question fields to draw and the answer to submit:

| View | Draw from Q | Submit A | Port from |
| --- | --- | --- | --- |
| scale | `left/right` fixed fruit, `tray`, `key` (weight table), `liveTilt` (padlock when false), `showCounts` (+ `compareSign()`) | `{ addedLeft, addedRight }` | scale.html (brass scale) |
| robot | `size`, `start`, `goal`, `blocks`, `walls`, `maxSteps` | `Dir[]`; animate with `simulate(q, program).cells`, stop at `crashAt` | robot.html |
| basket | `loose`, `bags` (bags of 10 = tangerines), `order`, `showCounts`; prompt from `text.prompt(q)` | `{ loose, bags }` currently in Mèo's basket | basket.html (teal basket) |
| equations | `known` (Bảng số), `clues` (Manh mối 1..n), `ask` (question row) | number | equations.html |
| split | `mode`, `scene` (`SCENES`), `layout` (kind index per item), `blanks`; sentence segments from `text.sentence(q)` | `{ whole?, a?, b? }` | split.html (ceramic vase, number bond) |
| compare | `items`, `weighings` (mini brass scales), `mode`, `BOXES[box].hue` | box or `Box[]` (order) | compare.html |

Extra notes:
- **Picture panel (basket):** shown when `settings.muted`, or after the first wrong try. The view reads `api.wrongTries()` and subscribes to the store for mute changes (`basket.ts`).
- **Tier 2 tens wording (basket):** done inside `text.hint(result, q)`, which returns the praise detail with the reading as both text and clips; the play loop needs no special case.
- **Guide (i):**
  - First version: a card with `text.GUIDE_STEPS`, read aloud.
  - Show it automatically when `profile.games[id].seenGuide` is false, then call `markGuideSeen`.
  - Worked examples (ghost hand performing `logic.solve(q)` on a sample question) exist for Rô-bốt and Cái cân: add a script to `ui/games/demos.ts` and the "Xem Mèo làm mẫu" button appears by itself (`ui/demo.ts` does the rest).

## Screen time in the shell

- **Timing:** tick every second. Pass `inSet` knowledge by applying `breakDue` / `lockDue` only when the game screen reports "set finished" or the child is on home or profiles.
- **Events:**
  - `idleNudge`: Mèo bubble plus the `idle_nudge` clip
  - `idlePause`: dim overlay, "Chạm để chơi tiếp"
  - `warnDaily`: toast plus the `daily_warn` clip
  - `breakOver`: back home
- **Saving:** save `usage` into the active profile about every 10 s and on `visibilitychange`. Don't save every tick.

## Quality bar

- **Feel:** test on a real iPad in landscape, with Safari added to the home screen. Use touch, not a mouse.
- **Effect presets:** every screen must look right under all three effect presets, with sound on and off.
- **No layout shift** when Vietnamese text is long; check the longest prompts.
- **Screenshots:** headless Chrome works well for review:
  `chrome --headless=new --window-size=1180,820 --screenshot=out.png "http://localhost:5173/#/dev/scale/2/1/42"`
