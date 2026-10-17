# Architecture

**Thám tử Toán học Tí hon** is a frontend-only web app: Vite, TypeScript, plain DOM, and no framework. It builds to static files that run on a landscape iPad or a desktop browser, with no backend.

## Folder map

```
index.html              entry page (fonts, #app)
public/
  assets/emoji/         Fluent Emoji PNGs (MIT, see LICENSE-FluentEmoji.txt)
  audio/                teacher's voice clips <clipId>.mp3 (see docs/AUDIO_SCRIPT.md)
src/
  main.ts               app entry: imports the styles, calls startApp()
  core/                 PURE logic, no DOM, fully tested
    config.ts           every tunable number (docs/RULES.md)
    types.ts            Tier, Position, GameId, GameLogic, GameText, CheckResult
    rng.ts              seeded random (game logic never uses Math.random)
    dates.ts            local day keys "YYYY-MM-DD"
    difficulty.ts       adaptive tiers inside a set + next-set seed
    session.ts          SetRunner: the 5-question state machine
    rewards.ts          stars per set, streak (weekend rule)
    screentime.ts       session/daily limits, idle, breaks (tick model)
    settings.ts         Fx switches/presets, limits, PIN record
    pin.ts              PIN hash/check (keeps kids out; not security)
    teacher.ts          slider ranges, unlock expiry, PIN wait (teacher area rules)
    profiles.ts         Profile shape, recordSet, weekStrip, guide-seen
    storage.ts          versioned save, migrate, export/import, Store
  games/
    index.ts            registry GAMES: title, colours, art, logic, text, ready
    <id>/logic.ts       generate / check / solve for one game (pure, tested)
    <id>/text.ts        Mèo's lines: prompt(q,pos), hint(result,q), GUIDE_STEPS
  i18n/
    numbers.ts          numberWords(0–100) as in grade 1 textbooks
    speech.ts           Speech = { text, clips }; say(...) builds both
  audio/
    manifest.ts         every voice clip id → exact words (the recording script)
    voice.ts            plays clips in order; falls back to a vi-VN browser voice
    sfx.ts              Web Audio sound effects (no files)
  ui/                   shell + shared components (done, step 1); screens/ and games/ are built per BUILD_PLAN
  styles/               tokens.css, base.css, components.css, fx.css (ported from mockup/v2)
tests/                  Vitest: core rules + property tests for every game
scripts/audio-script.ts writes docs/AUDIO_SCRIPT.md from the manifest
mockup/v2/              clickable design mockups: the visual source of truth
```

## Layers

```
            ┌────────────────────────── ui/ (DOM) ───────────────────────────┐
 tap/drag → │ GameView ──answer──▶ GameScreen ──▶ SetRunner (core/session)   │
            │    ▲                    │   │            │                     │
            │    └──── question ──────┘   │            ▼                     │
            │                             │   games/<id>/logic.check()       │
            │  Mèo text + voice ◀── games/<id>/text.ts ◀─ CheckResult.reason │
            │                             ▼                                  │
            │                   Store (core/storage) ──▶ localStorage        │
            └────────────────────────────────────────────────────────────────┘
```

- **core/ and games/ never touch the DOM, timers, storage or Math.random.** This is what makes them testable. Keep it that way: a new rule means new logic plus a test.
- **ui/ never decides game rules.** A view draws a question and returns an answer. Whether the answer is right, what the hint says, and what comes next are decided by `SetRunner`, `logic.check` and `text.hint`.
- **All children's text is Vietnamese.** It is built with `say()` so the on-screen text and the voice clips match. Code and comments are in English.

## The game contract

Logic, already done: `GameLogic<Q, A>` in [types.ts](../src/core/types.ts).

```ts
generate(pos, rng): Q      // always solvable
check(q, a): CheckResult   // { correct, reason, data } — reason drives the hint
solve?(q): A               // a correct answer: guide demo, "reveal", tests
```

Text, already done: `GameText<Q>` gives `prompt(q, pos)`, `hint(result, q)` and `GUIDE_STEPS`.

View: implemented in `src/ui/games/` (contract in `types.ts`; Mấy và mấy is the working example). See [UI_GUIDE.md](UI_GUIDE.md), "Game views". In short:

```ts
interface GameView<Q, A> {
  mount(el: HTMLElement, q: Q, api: { submit(a: A): void; pos: Position; fx: Fx; sfx; speak }): void;
  playResult?(fb: AnswerFeedback): Promise<void>;  // tilt the scale, run the robot…
  reveal?(answer: A): Promise<void>;               // show the right answer
  unmount(): void;
}
```

## One set, start to finish

1. The game screen reads `profile.games[id].seed` and creates `new SetRunner(logic, seed, createRng(randomSeed()))`.
2. For each question:
   1. It shows `runner.position.tier` as "Vòng N", the dots from `runner.progress`, and `text.prompt(q, pos)` (text plus voice).
   2. It mounts the view with `runner.question`.
   3. When the view submits, it calls `runner.answer(a)` and gets a `{ outcome, result }`.
   4. It calls `view.playResult(fb)`, then shows the feedback:
      - `correct` / `correctOnRetry`: praise plus `text.hint(result)` (for example basket's "Hai chục là 20 quả cam")
      - `retry`: `text.hint(result)`, and the child tries again
      - `reveal`: `view.reveal(runner.solution())`, then continue
   5. It calls `runner.next()`.
3. When `runner.finished`:
   1. Take `runner.summary()` and show the star screen.
   2. Save with `store.updateProfile(p => recordSet(p, id, summary, settings, now, today))`.
   3. If screen time says a break or lock is due, go there; otherwise go home.

## State and saving

- **One document:** everything is one JSON document, `AppData`, under the localStorage key `ttth.data` (schema 1).
- **Store:** `Store` (in storage.ts) loads it and repairs bad or old data. `update(fn)` saves after every change, and `subscribe` lets screens redraw.
- **Changing the shape:** bump `SCHEMA` and add an upgrade step in `migrate()`. Never break old saves.
- **Profiles** hold:
  - stars and stars per day (last 14 days)
  - the streak
  - per game: seed, sets played, best stars, guide seen
  - history (last 300 sets)
  - today's screen-time usage
- **Backups:** `exportJSON` / `importJSON` exist because Safari can wipe storage after 7 days unless the app is installed to the home screen. Import errors come with Vietnamese messages ready to show.

## Audio

- **Voice clips:** `src/audio/manifest.ts` lists every clip and its exact words. `npm run audio:script` regenerates [AUDIO_SCRIPT.md](AUDIO_SCRIPT.md) for the teacher to record.
- **Voice packs:** clips live in `public/audio/<pack>/<clipId>.mp3`; the teacher picks the pack in the teacher area (`settings.voicePack`, see [TTS_PILOT.md](TTS_PILOT.md)). `audio/packs.json` is written by the build (and the dev server) from the folders present.
- **Playback:** `Voice.play(speech)` plays the clips in order. If a clip file is missing, it reads the whole sentence with the browser's Vietnamese voice; if the device has none, it stays silent, since the text is on screen anyway.
- **Unlocking:** call `voice.unlock()` in the first tap handler, because browsers block audio until the user interacts.
- **Sound effects:** `sfx.play("tap" | "pick" | "drop" | "win" | "oops" | "star")`. Set `sfx.enabled` from `settings.fx.sfx`, and `sfx.muted` and `voice.muted` from `settings.muted`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server (open the printed URL; `/mockup/v2/` also works) |
| `npm test` | Vitest, all rules and game generators |
| `npm run typecheck` | TypeScript, strict |
| `npm run build` | typecheck, then build static files to `dist/` |
| `npm run audio:script` | regenerate docs/AUDIO_SCRIPT.md |
| `npm run ui:check` | real-browser UI checks (needs `npm run dev` running; see UI_GUIDE.md) |
| `npm run pwa:check` | real-browser offline/install checks on the production build (needs `npm run build`, then `npm run preview -- --port 4173 --strictPort` running) |
