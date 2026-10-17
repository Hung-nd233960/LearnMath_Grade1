// End of a set: how many stars the child earned. Reads ctx.lastSet (set by the play screen).
import { GAMES } from "../../games/index.ts";
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { confetti } from "../effects.ts";
import { emoji, h } from "../dom.ts";
import { mascot } from "../mascot.ts";
import type { ScreenDef } from "../router.ts";
import "./stars.css";

export const starsScreen: ScreenDef = {
  decor: "home",
  mount({ ctx, screen }) {
    const result = ctx.lastSet;
    const game = result ? GAMES.find((g) => g.id === result.game) : undefined;
    if (!result || !game) {
      ctx.go("home"); // e.g. the page was reloaded on this screen: nothing to show
      return;
    }
    screen.classList.add("screen-stars");
    ctx.stage.setBackground(game.bgVar);
    const { summary } = result;

    const stars = h("div", { class: "star-row" },
      ...[0, 1, 2].map((i) => {
        const img = emoji("glowing_star", 112, i < summary.stars ? "" : "dim");
        img.style.setProperty("--i", String(i));
        return img;
      }));
    const chips = h("div", { class: "chips" },
      h("span", { class: "chip star" }, emoji("glowing_star", 30), `+${summary.stars}`),
      result.streak > 0 ? h("span", { class: "chip fire" }, emoji("fire", 30), STR.streakChip(result.streak)) : null);

    screen.append(h("div", { class: "center" },
      mascot("happy"),
      h("h1", null, STR.setDone),
      stars,
      h("p", { class: "score" }, STR.score(summary.score, summary.total)),
      chips,
      h("button", { class: "btn btn-primary", id: "back-home", onclick: () => ctx.go("home") }, STR.backHome)));

    confetti(ctx.stage.el);
    void ctx.voice.play(say("set_done"));
    // one chime per earned star, in step with the pop-in animation
    const timers = Array.from({ length: summary.stars }, (_, i) => window.setTimeout(() => ctx.sfx.play("star"), 450 + i * 380));

    return () => {
      timers.forEach(clearTimeout);
      ctx.voice.stop();
      ctx.lastSet = null; // shown once: coming back to this route later has nothing to show
    };
  },
};
