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

## 7. Rô-bốt ☐
- [ ] `src/ui/games/robot.ts`: square grid, blocks (brick), walls (red bars), program slots (max 12), arrow pad + keyboard arrows, Làm lại / Chạy!, animate `simulate().cells`, nudge + shake on `crashAt`
- **Done when:** every tier's generated level can be solved by entering `logic.solve(q)`.

## 8. So sánh cân ☐
- [ ] `src/ui/games/compare.ts`: mini brass scales from `weighings`, tap-one (heaviest / lightest) or order slots
- **Done when:** all three modes work; tier 3 shuffled scales still read correctly.

## 9. Screen time ☐
- [ ] Tick loop in `app.ts`, input tracking, idle nudge / pause, daily warning toast
- [ ] Apply break / lock only between sets → `#/break`, `#/locked`
- **Done when:** with limits set to 1 / 2 minutes in the teacher area, the break and the lock appear after a set, never during one, and idle time does not count.

## 10. Teacher area ☐
- [ ] Padlock hold → `#/teacher` PIN gate (`checkPin`; prompt to change the default 1234)
- [ ] Tabs: Hiệu ứng (presets + 4 switches), Thời gian chơi (limits, weekend streak), Học sinh (table + add / rename / remove), Sao lưu (`exportJSON` download / `importJSON` upload, change PIN)
- [ ] Break / lock screens: adult can `grantBonus` / `endBreak`
- **Done when:** the settings change behaviour immediately, and an export imported on another browser restores everything.

## 11. Guide (i) ☐
- [ ] Card with `GUIDE_STEPS` + voice; auto-show the first time (`seenGuide`) → `markGuideSeen`
- [ ] (stretch) ghost hand performing `logic.solve()` on a sample question

## 12. Installable + offline ☐
- [ ] `public/manifest.webmanifest` (name, icons, `display: fullscreen`, `orientation: landscape`)
- [ ] Small service worker caching the built files, emoji and audio (no extra dependencies needed); register it in `main.ts` (production only)
- **Done when:** the app installs to the iPad home screen and opens offline.

## 13. Polish and QA ☐
- [ ] Run through the UI_GUIDE.md quality bar on a real iPad
- [ ] `npm run build`; deploy `dist/` (GitHub Pages / Netlify)
- [ ] Record the voice: hand [AUDIO_SCRIPT.md](AUDIO_SCRIPT.md) to the teacher; drop the files into `public/audio/`

---

## Later / stretch (not in the 5-day scope)

- **Rô-bốt variants:**
  - number path: follow 1-2-3 / 2-4-6 / 10-20-30 across the grid; green / red cells
  - "collect exactly 10": +/− cells with a running total
  - Design notes are in Games_Description, section 6.2. Add them as new question `kind`s in `robot/logic.ts`, with tests.
- **Cái cân shapes variant:** triangle = 3, square = 4, at tier 3.
- **Effects per child**, instead of per device.
- **Teacher class overview** from imported backups of several devices.
