# Build plan

## What's done and what's next

**The foundation is done** (built by Opus):
- the core rules
- the logic and Vietnamese text of all 6 games
- storage, audio and voice
- 46 tests

**Next is the UI build** (Sonnet). Work through the steps in order, and keep `npm test` and `npm run typecheck` green after each one. Read [ARCHITECTURE.md](ARCHITECTURE.md), [UI_GUIDE.md](UI_GUIDE.md) and [RULES.md](RULES.md) before starting.

**Status:** each step's heading ends with ☐ (to do) or ☑ (done). Update it as you go.

---

## 0. Foundation ☑
- [x] Vite + TypeScript + Vitest project, folder structure, Fluent Emoji in `public/assets/emoji`
- [x] `core/`: config, rng, dates, difficulty, session (`SetRunner`), rewards, screentime, settings, pin, profiles, storage
- [x] `games/<id>/logic.ts` + `text.ts` for all 6 games, registry `games/index.ts`
- [x] `i18n/` number words + `say()`; `audio/` manifest, voice, sfx; `npm run audio:script`
- [x] Tests: rules and property tests (every position × 150 seeds per game)

## 1. UI foundation ☑
- [x] `src/styles/` from `mockup/v2/shared.css` (tokens, base, components, fx)
- [x] `src/ui/`: `stage`, `dom`, `icons`, `mascot`, `svgDefs`, `overlay`, `effects`, `fx`, `dragTap`, `numpad`, `adultGate`, `decor`, `topbar`, `router`, `context`, `app`; fixed texts in `src/i18n/ui.ts`
- [x] `main.ts` boots `app`; a placeholder home screen; a dev-only component gallery at `#/kit`
- [x] Tests: `tests/ui.test.ts` (routes, scaling, portrait) and `npm run ui:check` (65 real-browser checks incl. step 2: scaling, portrait notice, settings → page classes, mute, numpad, drag and tap-then-tap, padlock hold, feedback/guide overlays, cleanup on navigation)
- **Done when:** `npm run dev` shows an empty stage that scales to the window, the portrait notice works, and the fx classes follow `store.data.settings.fx`. ✔ checked in a real browser. The shared pieces are documented in [UI_GUIDE.md](UI_GUIDE.md), "UI modules".

## 2. Profiles and home ☑
- [x] `#/who`: profile picker, 8 tiles per page with a pager; "+ Thêm bạn" opens the add form (name + picture from `AVATARS`); the first run (no children) opens the form by itself; choosing a child calls `voice.unlock()` and goes home
- [x] `#/home` with real data: greeting, stars / streak / time-left chips, week strip, six tiles from `GAMES` (level, best stars, "Mới!" for unplayed, "Sắp ra mắt" while `ready` is false), child chip → picker, speaker, padlock → teacher
- [x] Route guard: no chosen child → every route except `who`, `teacher`, `kit` goes to the picker
- [x] Tests: `dailyLeftNow`, `paginate`; `npm run ui:check` now has 65 checks (22 new: add form, two children with separate stars and streak, switching, reload keeps the last child, paging, guard)
- **Done when:** you can create two profiles, switch between them, and see separate stars and streak. ✔ checked in a real browser.
- **Notes for later steps:**
  - Set `ready: true` in `src/games/index.ts` when a game's screen is built (steps 3–8). Until then its tile is locked. In dev, open `/?allready` to preview the playable look.
  - The home screen is drawn once and not redrawn on store changes. Step 9 should update the "còn N phút" chip itself (or re-mount home) when the daily limit changes.
  - Adding children from the picker is open to everyone for now. Step 10 adds the same form to the teacher area (reuse `openAddProfile`); decide there whether to hide "+ Thêm bạn" from the child picker once the teacher area can do it.

## 3. Play loop + Mấy và mấy ☑
- [x] `#/play/<id>` (`screens/play.ts`): runs one set with `SetRunner`: top bar with live "Vòng N" and dots, prompt + voice + replay, feedback cards (correct / retry / reveal), guide (i), next, finish → `recordSet` + save → `#/stars`. It knows nothing about any particular game.
- [x] The view contract (`ui/games/types.ts`: `mount / playResult / reveal / reset / unmount`) and the registry `ui/games/index.ts` (`VIEWS`)
- [x] `#/stars` (`screens/stars.ts`): Mèo, stars popping in one by one with a chime, score, streak chip, confetti, "Về trang chủ"
- [x] `ui/games/split.ts` + `bond.ts` + `splitLayout.ts`: vase or basket picture with tap-to-count, sentence with answer boxes, number bond (mirrors typed numbers in Vòng 2, big in Vòng 3), numpad; `ready: true` for `split`
- [x] Dev route `#/dev/<id>/<tier>/<step>/<seed>` (`screens/dev.ts`): one deterministic question, a "Giải" button to show the solution, and the judged result; nothing is saved
- [x] Tests: `tests/splitLayout.test.ts` (no overlaps, inside the panel, for every count); `npm run ui:check` now has 99 checks, including whole sets played through the UI (all correct; wrong then right; out of tries → reveal), saving, leaving early, routes and the dev route
- **Done when:** a full set of 5 plays end to end; the star count matches `starsForSet`; reloading shows the new seed tier on the home tile. ✔ checked in a real browser (set 1: 5/5 → 3 stars, seed moves up; set 2: retries and a revealed answer do not count → 3/5 → 2 stars).
- **How to add the next game's screen (steps 4–8):**
  1. Write `src/ui/games/<id>.ts` exporting `create<Id>View(): GameView<Q, A>` and its CSS (copy the split view's structure). Draw into the `el` you get in `mount`; call `api.submit(answer)` from "Xong" / "Chạy!".
  2. Register it in `src/ui/games/index.ts` and set `ready: true` for the game in `src/games/index.ts`.
  3. Review it at every tier with `#/dev/<id>/<tier>/<step>/<seed>`, then add play-through checks to `scripts/ui-check.mjs` (read the question from the DOM, answer like a child would, as the Mấy và mấy checks do).
- **Known gaps (later steps):** the guide (i) opens from the button but does not yet auto-open on first play or speak the steps (step 11); no break or lock between sets (step 9); the picture-panel and Mèo-bubble prompt that the basket game wants are added in step 5 (the generic prompt bar is used until then).

## 4. Tính theo hình ☑
- [x] `src/ui/games/equations.ts` (+ `equations.css`): "Bảng số" strip, numbered "Manh mối" rows, the question row with an answer box, the 3-column numpad; rows carry `data-fruits` / `data-total` so tests can solve from the screen; `ready: true`
- [x] `npm run ui:check` now has 117 checks: a whole set solved from what is on screen (every puzzle verified to have exactly one answer), empty "Xong", wrong → retry → right, leaving early, dev route at Vòng 3
- **Done when:** a set plays at every tier via `#/dev/equations/<t>/<s>/<seed>`. ✔ checked in a real browser.
- **Notes:** the view reuses `createNumpad`, `setBox`, `boxValue`, the `answer-box` right/wrong styles and the shake-on-empty pattern from the split view. If a third game needs the same "empty box → shake + `pick_number`" code, move it into a shared helper.

## 5. Giỏ trái cây ☑
- [x] `src/ui/games/basket.ts` (+ `basket.css`): Mèo's speech bubble, two teal baskets, fruit and bags of ten moved by drag or tap-then-tap, live counts (Vòng 1 only), the picture panel, red/green outline on Mèo's basket, reveal that moves the right fruit across; `ready: true`
- [x] View contract extended: `GameView.ownPrompt` (the play loop hides its prompt bar) and `GameViewApi.prompt / replayPrompt() / wrongTries()`. Shared drawings moved to `ui/games/art.ts` (basket, table).
- [x] After a correct Vòng 2 answer Mèo names the amount both ways, shown AND spoken ("Hai chục là 20 quả cam" / "Một chục và 3 quả là 13 quả cam") from recorded clips; one new clip `la` ("là") was added, `docs/AUDIO_SCRIPT.md` regenerated (97 clips)
- [x] `npm run ui:check` has 148 checks: tap and drag moving, live counts, sound off → panel (number + picture), a whole set with bags, too many → retry + panel, empty basket twice → reveal, dev route: the basket holds 2–9 loose oranges and all of them together are still too few for a chục, one bag accepted, "không quả …" is right with an empty basket and wrong with a fruit, "Giải"
- **Done when:** tier 2 shows all three phrasings; a chục can only be made with a bag. ✔ checked in a real browser.
- **Decision to confirm:** the picture panel appears after the **first** wrong try (or whenever sound is off), not after two. A child gets one retry, so "after 2 wrong tries" would only be the reveal, too late to help. Change `syncPanel` in `basket.ts` if the teachers disagree.

## 6. Cái cân ☑
- [x] `src/ui/games/scale.ts` (+ `scale.css`): the brass scale (beam, chains, pans, stand), weight table (Vòng 2+), tray, fixed fruit on the pans, the child's own fruit movable between the pans and the tray (drag or tap-then-tap); Vòng 1 tips live with counts and the >, <, = sign; from Vòng 2 a padlock holds the beam level until "Xong", then it tips to show the result and levels again on a retry; the reveal puts the right fruit on the pans; `ready: true`
- [x] `npm run ui:check` has 178 checks (30 new): live tilt, counts and sign, fixed fruit cannot move, fruit on the heavier pan widens the gap and can be taken back, drag from the tray, padlock and level beam in Vòng 2+, a whole set, unbalanced → "Đĩa bên … còn nặng hơn", retry then praise, reveal balances the pans, dev route with the three-kind table. The global watchdog of the check was raised to 7 minutes.
- **Done when:** the tilt direction always matches `check()`'s `leftHeavier` / `rightHeavier`. ✔ checked in a real browser (the beam rotates by the same weights `check()` compares).

## 7. Rô-bốt ☑
- [x] `src/ui/games/robot.ts` (+ `robot.css`): square board from the question (flag, bricks, red walls), arrow pad + keyboard arrows, 12 step slots, "Làm lại" / "Chạy!"; the walk is animated from `simulate()` (the same function that judges), with a bump-and-return on a blocked step, a green flag square and a hop on success; the reveal fills the slots with the shortest route and walks it; `ready: true`
- [x] Helpers for small children: tapping the **last** step removes it (undo), Backspace too; "Chạy!" with no steps is a nudge, not a wrong try; the program is kept after a wrong try so it can be fixed
- [x] `npm run ui:check` has 206 checks (28 new): the checks find the route themselves (breadth-first search over the walls and bricks read from the screen) and drive the pad, keyboard, undo, the 12-step limit, an empty run, a bump into the edge, stopping short, a whole set, reveal, and the dev route with walls and bricks. The overlay wait is 15 s (a walk is slow) and the global watchdog is 15 min.
- **Done when:** every tier's generated level can be solved by entering the shortest route. ✔ checked in a real browser (route found from the drawn board).
- **Not built (stretch, see "Later"):** the number-pattern and "collect 10" variants.

## 8. So sánh cân ☑
- [x] `src/ui/games/compare.ts` (+ `compare.css`): small brass scales built from the same pieces as game 1 (the beam tips toward the heavier box; boxes are one gift picture recoloured), three question forms (tap the heaviest / the lightest / put all in order), order slots with "nhẹ nhất" / "nặng nhất" labels, tapping a placed box takes it out, an unfinished row is a nudge (not a wrong try), after a wrong order the correct start of the row stays and only the rest is cleared, reveal fills the right order; `ready: true`
- [x] `npm run ui:check` has 236 checks (30 new): the checks work the order out themselves from the scales on screen (following A<B, B<C…), a whole set in whichever mode comes up, wrong then right, wrong twice → reveal, and on the dev route: nudge, taking a box out, swapped last two → kept prefix, finishing correctly, a wrong single pick, Vòng 3 shuffled scales, "Giải"
- **Done when:** all three modes work; tier 3 shuffled scales still read correctly. ✔ checked in a real browser.
- **All six games now have a screen.** The tile "Sắp ra mắt" state in `home.ts` is still used by `ready: false` games (none now), and `?allready` has no visible effect.

## 9. Screen time ☑
- [x] `src/ui/timekeeper.ts`: the clock. It owns the active child's usage in memory, ticks once a second through the pure model in `core/screentime.ts`, saves into the profile about every 10 s, when the page is hidden and when the child changes, and counts only real use (home, play, star screen; not a break, the picker or the teacher area). Pure helpers `gateFor` and `formatClock` are unit tested.
- [x] Notices (`notices.ts`): a toast after 20 s idle ("Em ơi, em có cần Mèo giúp không?"), a "Mèo chờ em nhé" overlay after 60 s idle (any touch resumes), a toast before the daily limit; each with its voice clip. Idle time is not counted.
- [x] `#/break` (countdown, tips, Mèo asleep) and `#/locked` (night colours, stars and streak today), both with "Bạn khác chơi" (another child can take over the tablet) and the padlock.
- [x] **Never mid-set:** a due break or lock replaces `home` and the start of a new set (router guard) and is applied on the home screen as soon as it is due; the set in progress and the star screen are never interrupted.
- [x] Home's "còn N phút" follows the clock. The picker no longer redraws every time usage is saved.
- [x] For step 10: `ctx.time.grantBonus(minutes)` and `ctx.time.endBreak()` exist and are tested through the lock screen; the PIN screen only has to call them.
- [x] `npm run ui:check` has 261 checks (55 new in steps 8–9 together): idle nudge and pause, time not counted while paused, break due mid-set but not applied, star screen untouched, break screen, time not counted on a break, no new set during a break, another child can play, break ends by itself, daily warning toast, night screen, no new set when locked, extra time ends the lock, a new day resets. They use tiny limits (seconds) so the real clock is tested.
- **A bug found by these tests:** switching children recursed forever (saving the previous child's time notified subscribers that still saw the old child). Fixed by taking over the new child first.
- **Done when:** with limits set to 1 / 2 minutes in the teacher area, the break and the lock appear after a set, never during one, and idle time does not count. ✔ checked in a real browser (limits set directly until step 10 adds the sliders).

## 10. Teacher area ☑
- [x] `#/teacher` (`screens/teacher.ts`): the padlock (hold ~1 s; now also on the picker, so a teacher can restore a backup before any child exists) opens a PIN gate (`checkPin`, `pinPad.ts`). Five wrong codes in a row make the pad wait 30 s, and the wait survives leaving and coming back. While the default `1234` is still set, every tab shows a yellow "Đổi mã PIN" bar.
- [x] Tabs: **Hiệu ứng** (presets + 4 switches; they change the page the moment they are touched), **Thời gian chơi** (the playing child's time today with +10 / +20 phút and "Kết thúc nghỉ mắt", then sliders for session, break, daily limit and idle nudge, and the weekend-streak switch), **Học sinh** (stars, streak and the Vòng each child has reached in all six games; add, rename / change picture, remove with a confirmation), **Sao lưu** (download, import with a confirmation, change PIN with a type-it-twice check).
- [x] Break / lock screens: the padlock there opens the same area; "+10 phút" ends a lock, "Kết thúc nghỉ mắt" ends a break (`ctx.time.grantBonus` / `endBreak`).
- [x] Unlock: held in `sessionStorage` (a reload does not ask again), dropped when the area is left, and closed after `TEACHER_UNLOCK_MINUTES` without a touch.
- [x] Pure parts in `core/teacher.ts` (slider ranges, `setLimit`, `unlockValid`, PIN wait) and `Store.patchProfile` / `Store.replace`, all unit tested (`tests/teacher.test.ts`).
- [x] `npm run ui:check`: 321 checks (60 new): gate, wrong/right PIN, every tab, a restore from an exported file, a bad file, bonus on the lock screen, ending a break, PIN change, 30-minute expiry, lockout.
- **Bugs found by these checks:** the gate's back button sat under the full-screen gate layer; a `hidden` button stayed visible because `.btn` sets `display`; the extra-time buttons were off the bottom of the panel (they now come first on the tab).
- **Done when:** the settings change behaviour immediately ✔, and an export imported on another browser restores everything ✔ (export → fresh store → import is unit tested; import of a real file is browser tested).
- **Decision for you:** "+ Thêm bạn" is still on the child picker. Now that the teacher area can add children, you can hide it there once the first child exists (one line in `screens/who.ts`).

## 11. Guide (i) ☑
- [x] The guide card reads its steps aloud one after another, marking the one being read (`showGuide(stage, steps, { voice, onStep, onClose })` in `overlay.ts`); "Nghe lại" reads them again; closing stops the voice. With no voice (muted, or no clips and no Vietnamese voice on the device) nothing is marked and nothing races through.
- [x] `GUIDE_STEPS` are now `Speech[]` built from 24 new clips (`guide_<game>_1…4`, group "Hướng dẫn (i)" in the manifest; `docs/AUDIO_SCRIPT.md` regenerated: 121 clips). Numbers are spelled out in the spoken lines.
- [x] Auto-show the first time a child plays a game (`seenGuide`), marked seen as soon as it opens (`markGuideSeen`); the (i) button opens it any time. Closing it, either way, makes Mèo read the question again.
- [x] Listening counts as activity (`ctx.time.touch()` at each step), so the 20 s idle nudge does not fire during a long narration.
- [x] `npm run ui:check`: 339 checks (18 new): first time opens by itself, four steps, marked seen per game, stays closed the second time, (i) reopens it, a child who has seen it is not interrupted, narration order and highlight with a fake voice, closing stops the voice, silent device.
- [x] (stretch) **Mèo's worked example** ("Xem Mèo làm mẫu") for **Rô-bốt** and **Cái cân**: see step 13. Other games keep the voiced text card.

## 12. Installable + offline ☑
- [x] `public/manifest.webmanifest`: name, `display: fullscreen` (standalone as the fallback), landscape, 192 and 512 icons (maskable), start page `./`. Icons are Mèo drawn by `scripts/make-icons.mjs` into `public/icons/` (run it again only if the mascot changes). Apple touch icon and title in `index.html`.
- [x] `vite.config.ts` has a small plugin that writes `dist/sw.js` from `scripts/sw.template.js`: it lists every built file and every file in `public/` (pictures, fonts, voice clips) and keeps them all in one cache named for the build. Cache first; a missing file (a 404, e.g. a voice clip not recorded yet) is passed through and never cached, so the app still falls back to the browser voice; opening a page offline always gets the app. A new build replaces the old cache. No dependency added.
- [x] Registered in `main.ts` in production only (the dev server is never cached).
- [x] **Fonts are self-hosted** (`public/fonts/`, `src/styles/fonts.css`; Baloo 2 and Be Vietnam Pro, SIL Open Font Licence, Vietnamese + Latin subsets, 448 KB). Without this the app would lose its fonts offline, and it no longer calls Google.
- [x] `npm run pwa:check` (build, `npm run preview -- --port 4173 --strictPort`, then the check): 27 checks in real Chrome on the production build — manifest valid, Chrome reports nothing in the way of installing, the worker is active and controls the page, the cache holds the page / script / style / 21 fonts / all pictures, then with the network **switched off** and the page reloaded: the app opens, the saved child is there, pictures and both fonts are shown, a child reaches home and opens a game (with its guide), and a deep link still opens.
- **Bug found by the first run:** the template's own comment contained the placeholder text, so the build filled the comment and left the real placeholder in; the worker failed to start. The comment no longer names the placeholders.
- **Done when:** the app installs to the iPad home screen and opens offline. ✔ in desktop Chrome; **still to do by hand on the real iPad** (step 13): Safari → Share → "Thêm vào Màn hình chính", open it once online, switch Wi-Fi off, open it again. Safari ignores `display: fullscreen` and `orientation` from the manifest: the "turn sideways" screen covers portrait.
- **Deploying a new version:** upload the whole `dist/` folder. Devices pick up the new version the next time they open the app online (the new worker takes over at once; the open page keeps working).

## 13. Polish and QA ◐ (in progress)
- [x] **Mèo's worked examples** for Rô-bốt and Cái cân. `ui/demo.ts` mounts its own copy of the game view in a layer over the play screen, on a fixed sample question (`ui/games/demos.ts`: robot Vòng 2 with a wall, bricks and a turn; scale Vòng 2 with two kinds of fruit and the key). A ghost hand (Fluent "backhand index pointing up", MIT) moves to each control and taps it with the same pointer events a child makes, Mèo says what she does (11 new clips, group "Mèo làm mẫu"), the view shows the real result, and nothing is scored or saved. "Dừng", "Xem lại" and "Đến lượt em!" end or repeat it; the guide card offers it through the "Xem Mèo làm mẫu" button. The sample questions are unit tested (`tests/games.test.ts`) so a generator change cannot silently break the demo. To add a game: write its script in `demos.ts`.
- [x] **Desktop app (Tauri 2)** in `src-tauri/`: a thin Rust shell that shows `dist/` in a native window (1180×820, resizable), with the app icon. `npm run desktop:build` builds the web app, then the `.exe` (`src-tauri/target/release/tham-tu-toan-hoc.exe`, about 7 MB) and an NSIS installer (`src-tauri/target/release/bundle/nsis/`). It needs Rust (`rustup`), the Visual Studio Build Tools and WebView2 (already part of Windows 11); the first build downloads crates and takes about 6 minutes. The service worker is skipped there (the app already carries its files); data lives in the app's own WebView2 storage, so use Sao lưu to move children between the browser version and the desktop version. The exe is not committed (`src-tauri/target/` is ignored): rebuild or attach it to a release.
- [x] **User guide** in `docs/guide/` (Vietnamese and English, Markdown and HTML, 34 screenshots and 2 videos of the worked examples): written for teachers and parents. It is generated: `node scripts/guide-shots.mjs` (needs `npm run dev`) retakes the pictures and videos by driving the real app, `node scripts/make-guide.mjs` rebuilds the pages from `scripts/guide-content.mjs`. Retake after any visible change. The videos are WebM (play in Chrome, Edge, Firefox and current Safari); the pictures are the fallback.
- [x] **Voice packs + TTS pilot** ([TTS_PILOT.md](TTS_PILOT.md)): the teacher area has a tab **Giọng nói** to choose the voice: *Giọng của máy* (the device's own), *Giọng giáo viên* (the recordings, `public/audio/teacher/`), or any other folder in `public/audio/<pack>/`. A pack is just a folder of `<clipId>.mp3` (+ optional `pack.json`); the build lists them in `audio/packs.json` (`vite.config.ts`, also served by the dev server), so nothing is registered by hand. The default (nothing chosen) is the first *complete* pack by `order`, so the teacher's voice takes over by itself once all clips are recorded. "Nghe thử" plays a sample from a pack without switching to it (even when the children's sound is off). Setting `voicePack` is additive (older saves get `null`), so `SCHEMA` stays 1. The pilot made three placeholder packs (Hoài My, Nam Minh, Piper; 132/132 clips each, trimmed of the silence TTS engines add) with `scripts/tts-pilot.mjs`; they are **not committed** (licences, see the doc). Unit tests in `tests/voicepacks.test.ts`; browser checks in `ui:check` section 16.
- [x] **Feedback round after the first listen/look:** (1) the demo's tap is now a **glow on the control plus a ripple of light under the fingertip** instead of a flicking hand; (2) the **idle nudge moves from 20 s to 1 minute and the pause from 60 s to 3 minutes** (older saves still holding 20/60 are upgraded; slider range 10–120 s); (3) **background music**: a light tune for the lobby and one for each game (7 in all), composed by rules (`src/audio/music.ts`, pure and tested; `src/audio/bgm.ts` plays it with Web Audio, with crossfades, ducking under Mèo's voice, and a fade-out when the game pauses), plus the **sound mixer** opened by holding the speaker button (`src/ui/soundPanel.ts`: master, music, effects, voice; `settings.mix`), plus a fifth effect switch `music` in the teacher area (the Yên tĩnh preset has none); (4) the music was made **brighter and livelier** after the first version was judged bland: a higher register, a bouncy chord strum instead of a held drone, a walking bass, a shaker or woodblock, sparkles on top, quicker tempos, all major pentatonic. `node scripts/bgm-preview.mjs` renders every tune to `audio-pilot/bgm/<track>.wav` to listen to without the app, and prints loudness checks (nothing clips); (5) the time tab gets **−10 / −20 phút** next to +10 / +20 (undo a misclick) and **"Cho bé [tên] nghỉ sớm"** (end today's play at once; `+10 phút` gives it back).
- [ ] Run through the UI_GUIDE.md quality bar on a real iPad (including the Safari "Thêm vào Màn hình chính" test from step 12)
- [ ] `npm run build`; deploy `dist/` (GitHub Pages / Netlify)
- [ ] Record the voice: hand [AUDIO_SCRIPT.md](AUDIO_SCRIPT.md) to the teacher (now 132 clips); drop the files into `public/audio/`
- [ ] Worked examples for the other four games, if the teachers ask (same pattern; Giỏ trái cây is next in line)

## 14. Feedback round 2 ☐
The teachers' second round (2026-10-18). Each item has a detailed task file in [docs/tasks/](tasks/README.md); do them in order. Where a task file disagrees with CLAUDE.md, the task file wins until task 10 updates CLAUDE.md.
- [x] 00 Tidy the feedback into `docs/feedbacks/`, move the images ([task](tasks/00-feedback-docs.md))
- [x] 01 Giải mã hình: rename, several rows in Vòng 1, distinct values ([task](tasks/01-giai-ma-hinh.md))
- [x] 02 Thăng bằng: merge Cái cân + So sánh cân, inference in Vòng 3, `SCHEMA` 2 ([task](tasks/02-thang-bang.md))
  - Game id `scale` kept. `games/scale/{balance,compare,infer}.ts` hold the three kinds (`kind` tag); `logic.ts` dispatches. Views: `ui/games/scale.ts` picks `scale/{balance,compare,infer}.ts`; the big scale is one `mountBalance()` shared by Vòng 1 and the inference (drawn at 76%, left pan locked).
  - `compare` is gone from `GAME_IDS`; `pattern` is in, as a stub with `ready: false` (task 03). `SCHEMA` is 2: `games.compare` is dropped, history kept, a scale seed past Vòng 1 step 2 restarts there. Mango emoji added (Fluent, MIT).
  - Guide steps for the scale were re-worded (`guide_scale_1…4`), so the voice packs need those clips regenerated (task 09). `scripts/guide-shots.mjs` and `guide-content.mjs` still mention `compare` (task 10).
- [ ] 03 Quy luật: new game `pattern` ([task](tasks/03-quy-luat.md))
- [ ] 04 Daily plan: games per day, one at a time, replay for no credit ([task](tasks/04-daily-plan.md))
- [ ] 05 Chia quả: rename, "cần thêm" and "bằng nhau" modes ([task](tasks/05-chia-qua.md))
- [ ] 06 Mấy và mấy: garden scene with animals ([task](tasks/06-may-va-may-garden.md))
- [ ] 07 Living tile scenes (swaying leaves, clouds, sparkles) and Mèo's new look ([task](tasks/07-art.md))
- [ ] 08 Phones in landscape, wide layout ([task](tasks/08-phone.md))
- [ ] 09 Voice: Nam Minh (Northern) as the default ([task](tasks/09-voice.md))
- [ ] 10 Docs and user guide sync ([task](tasks/10-docs-sync.md))
- [ ] 11 Three desktop builds: 16:9, iPad, iPhone 15 ([task](tasks/11-tauri-sizes.md))

---

## Later / stretch (not in the 5-day scope)

- **Rô-bốt variants:**
  - number path: follow 1-2-3 / 2-4-6 / 10-20-30 across the grid; green / red cells
  - "collect exactly 10": +/− cells with a running total
  - Design notes are in Games_Description, section 6.2. Add them as new question `kind`s in `robot/logic.ts`, with tests.
- **Cái cân shapes variant:** triangle = 3, square = 4, at tier 3.
- **Effects per child**, instead of per device.
- **Teacher class overview** from imported backups of several devices.
