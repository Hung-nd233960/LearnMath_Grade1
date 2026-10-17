// The play loop: one set of questions of one game (#/play/<gameId>).
//
//   show question → child answers → SetRunner decides (correct / retry / reveal) → feedback
//   → next question … → after the last one: save the set and go to the star screen.
//
// This file knows nothing about any particular game: the view draws and returns answers,
// logic.check() judges, text.hint() words the hint.
import { createRng, randomSeed } from "../../core/rng.ts";
import { markGuideSeen, recordSet, starsToday, streakToday } from "../../core/profiles.ts";
import { SetRunner, type AnswerFeedback } from "../../core/session.ts";
import type { GameId } from "../../core/types.ts";
import { GAMES } from "../../games/index.ts";
import { praise, say, type Speech } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { h } from "../dom.ts";
import { mountDecor } from "../decor.ts";
import { VIEWS } from "../games/index.ts";
import type { GameView } from "../games/types.ts";
import { ICON } from "../icons.ts";
import { hasDemo, runDemo } from "../demo.ts";
import { showFeedback, showGuide } from "../overlay.ts";
import type { ScreenDef } from "../router.ts";
import { topbar } from "../topbar.ts";
import "./play.css";

export const playScreen: ScreenDef = {
  decor: null, // chosen per game below
  mount({ ctx, screen, params }) {
    const meta = GAMES.find((g) => g.id === (params[0] as GameId));
    const makeView = meta ? VIEWS[meta.id] : undefined;
    const profile = ctx.store.activeProfile;
    if (!meta || !makeView || !profile) {
      ctx.go("home");
      return;
    }
    const game = meta;
    screen.classList.add("screen-play");
    ctx.stage.setBackground(game.bgVar);
    mountDecor(screen, game.id);

    const runner = new SetRunner(game.logic, profile.games[game.id].seed, createRng(randomSeed()));
    let view: GameView<any, any> | null = null;
    let promptSpeech: Speech = say();
    let answering = false;
    let disposed = false;
    let wrongTries = 0;
    let stopDemo: (() => void) | null = null;

    const body = h("div", { class: "game-body" });
    const promptText = h("span");
    const promptBar = h("div", { class: "prompt" }, promptText);
    const replay = h("button", { class: "replay", title: STR.replay, onclick: () => void ctx.voice.play(promptSpeech) });
    replay.innerHTML = ICON.replay;
    const bar = topbar({
      tier: runner.position.tier,
      index: 0,
      length: runner.progress.length,
      onBack: () => ctx.go("home"), // leaving early: the unfinished set is not saved
      onInfo: () => openGuide(),
    });
    promptBar.append(replay);
    screen.append(body, promptBar, bar.el);

    // The guide (i) opens by itself the first time this child plays this game. Whenever it is
    // closed, Mèo reads the question again.
    const openGuide = () => {
      ctx.store.updateProfile((p) => (p.games[game.id].seenGuide ? p : markGuideSeen(p, game.id)));
      showGuide(ctx.stage.el, game.text.GUIDE_STEPS, {
        voice: ctx.voice,
        onStep: () => ctx.time.touch(),
        onDemo: hasDemo(game) ? () => { stopDemo = runDemo(ctx, game, () => { stopDemo = null; if (!disposed) void ctx.voice.play(promptSpeech); }); } : undefined,
        onClose: () => { if (!disposed && !stopDemo) void ctx.voice.play(promptSpeech); },
      });
    };

    const startQuestion = () => {
      view?.unmount();
      body.replaceChildren();
      const q = runner.question;
      const pos = runner.position;
      view = makeView();
      wrongTries = 0;
      promptSpeech = game.text.prompt(q, pos);
      promptText.textContent = promptSpeech.text;
      promptBar.hidden = !!view.ownPrompt;
      bar.setProgress(pos.tier, runner.progress.index, runner.progress.length);
      view.mount(body, q, {
        ctx,
        pos,
        speak: (s) => void ctx.voice.play(s),
        submit: (answer) => void onSubmit(answer),
        prompt: promptSpeech,
        replayPrompt: () => void ctx.voice.play(promptSpeech),
        wrongTries: () => wrongTries,
      });
      answering = true;
      void ctx.voice.play(promptSpeech);
    };

    const card = (kind: "correct" | "retry" | "reveal", title: string, message: string, speech: Speech, onClose: () => void) => {
      showFeedback(ctx.stage.el, { kind, title, message, onClose: () => { if (!disposed) onClose(); } });
      void ctx.voice.play(speech);
    };

    const onSubmit = async (answer: unknown) => {
      if (!answering || disposed || !view) return;
      answering = false;
      const q = runner.question;
      const fb: AnswerFeedback = runner.answer(answer);
      const hint = game.text.hint(fb.result, q);
      await view.playResult?.(fb);
      if (disposed) return;

      if (fb.outcome === "retry" || fb.outcome === "reveal") wrongTries++;
      if (fb.outcome === "retry") {
        card("retry", STR.almost, hint.text, say("try_again", hint), () => {
          view?.reset?.();
          answering = true;
        });
        return;
      }
      if (fb.outcome === "reveal") {
        const solution = runner.solution();
        if (solution !== undefined) await view.reveal?.(solution);
        if (disposed) return;
        card("reveal", STR.revealTitle, say("reveal").text, say("reveal"), advance);
        return;
      }
      const title = praise(runner.progress.index);
      card("correct", title.text, hint.text, say(title, hint), advance);
    };

    const advance = () => {
      runner.next();
      if (runner.finished) finish();
      else startQuestion();
    };

    const finish = () => {
      const summary = runner.summary();
      const today = ctx.today();
      const settings = ctx.store.data.settings;
      const firstStarToday = starsToday(ctx.store.activeProfile!, today) === 0;
      ctx.store.updateProfile((p) => recordSet(p, game.id, summary, settings, ctx.now(), today));
      ctx.lastSet = { game: game.id, summary, streak: streakToday(ctx.store.activeProfile!, today, settings), firstStarToday };
      ctx.go("stars");
    };

    startQuestion();
    if (!profile.games[game.id].seenGuide) openGuide();

    return () => {
      disposed = true;
      stopDemo?.();
      view?.unmount();
      ctx.voice.stop();
    };
  },
};
