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
- [x] Tests: `tests/ui.test.ts` (routes, scaling, portrait) and `npm run ui:check` (43 real-browser checks: scaling, portrait notice, settings → page classes, mute, numpad, drag and tap-then-tap, padlock hold, feedback/guide overlays, cleanup on navigation)
- **Done when:** `npm run dev` shows an empty stage that scales to the window, the portrait notice works, and the fx classes follow `store.data.settings.fx`. ✔ checked in a real browser. The shared pieces are documented in [UI_GUIDE.md](UI_GUIDE.md), "UI modules".

## 2. Profiles and home ☐
- [ ] `#/who`: profile picker; add a profile (name + avatar from `AVATARS`); the first tap calls `voice.unlock()`
- [ ] `#/home` with real data (see UI_GUIDE.md, "Routes and screens"); speaker toggles `settings.muted`
- **Done when:** you can create two profiles, switch between them, and see separate stars and streak (seed them by calling `recordSet` in the dev console).

## 3. Play loop + Mấy và mấy ☐
- [ ] `#/play/<id>` generic game screen: `SetRunner`, top bar, prompt + voice, feedback overlays (correct / retry / reveal), next, end
- [ ] `#/stars` end-of-set screen; `recordSet` + save; set `ready: true` for `split` in `GAMES`
- [ ] `src/ui/games/split.ts`: vase or basket picture with tap-to-mark, sentence from `text.sentence(q)`, number bond (tier 2 mirrors the typed numbers), numpad
- [ ] `#/dev/<id>/<tier>/<step>/<seed>` preview route (dev only)
- **Done when:** a full set of 5 plays end to end; the star count matches `starsForSet`; reloading shows the new seed tier on the home tile.

## 4. Tính theo hình ☐
- [ ] `src/ui/games/equations.ts`: Bảng số, Manh mối rows, question row with answer box, numpad
- **Done when:** a set plays at every tier via `#/dev/equations/<t>/<s>/<seed>`.

## 5. Giỏ trái cây ☐
- [ ] `src/ui/games/basket.ts`: two teal baskets, fruit + bags of 10 (`dragTap`), counts (tier 1 only), picture panel (muted, or after 2 wrong), `tensReading` praise
- **Done when:** tier 2 shows all three phrasings (try different seeds); 10 loose oranges are accepted with the tip.

## 6. Cái cân ☐
- [ ] `src/ui/games/scale.ts`: brass scale, live tilt (tier 1) / padlock until Xong (tier 2+), counts + `compareSign` (tier 1), weight key, tray drag
- **Done when:** the tilt direction always matches `check()`'s `leftHeavier` / `rightHeavier`.

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
