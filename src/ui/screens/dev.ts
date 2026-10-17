// Dev-only preview of ONE question: #/dev/<gameId>/<tier>/<step>/<seed>.
// Deterministic (same seed → same question), so it is the way to review a game at a given
// difficulty and to take screenshots. Answers are judged but nothing is saved.
import { createRng } from "../../core/rng.ts";
import type { GameId, Tier } from "../../core/types.ts";
import { GAMES } from "../../games/index.ts";
import { STR } from "../../i18n/ui.ts";
import { h } from "../dom.ts";
import { mountDecor } from "../decor.ts";
import { VIEWS } from "../games/index.ts";
import { ICON } from "../icons.ts";
import type { ScreenDef } from "../router.ts";
import { topbar } from "../topbar.ts";
import "./play.css";

export const devScreen: ScreenDef = {
  decor: null,
  mount({ ctx, screen, params }) {
    const meta = GAMES.find((g) => g.id === (params[0] as GameId));
    const makeView = meta ? VIEWS[meta.id] : undefined;
    if (!meta || !makeView) {
      ctx.go("home");
      return;
    }
    const tier = Math.max(1, Math.min(3, Number(params[1]) || 1)) as Tier;
    const step = Math.max(0, Math.min(2, Number(params[2]) || 0));
    const seed = Number(params[3]) || 1;
    const pos = { tier, step };
    const q = meta.logic.generate(pos, createRng(seed));

    screen.classList.add("screen-play");
    ctx.stage.setBackground(meta.bgVar);
    mountDecor(screen, meta.id);

    const prompt = meta.text.prompt(q, pos);
    const status = h("span", { id: "dev-status" }, `${meta.id} · Vòng ${tier} · bước ${step} · seed ${seed}`);
    const solveButton = h("button", { id: "dev-solve" }, STR.devSolve);
    const view = makeView();
    const body = h("div", { class: "game-body" });
    const replay = h("button", { class: "replay", onclick: () => void ctx.voice.play(prompt) });
    replay.innerHTML = ICON.replay;
    const bar = topbar({ tier, index: 0, length: 5, onBack: () => ctx.go("home") });
    screen.append(body, h("div", { class: "prompt" }, h("span", null, prompt.text), replay), bar.el, h("div", { class: "dev-bar" }, status, solveButton));

    view.mount(body, q, {
      ctx,
      pos,
      speak: (s) => void ctx.voice.play(s),
      submit: async (answer) => {
        const result = meta.logic.check(q, answer);
        status.textContent = `${result.correct ? "✔" : "✘"} ${result.reason}`;
        await view.playResult?.({ outcome: result.correct ? "correct" : "retry", result, canContinue: result.correct });
        if (!result.correct) view.reset?.();
      },
    });
    solveButton.addEventListener("click", async () => {
      const answer = meta.logic.solve?.(q);
      if (answer !== undefined) await view.reveal?.(answer);
      status.textContent = "revealed";
    });
    return () => view.unmount();
  },
};
