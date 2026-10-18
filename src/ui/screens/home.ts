// Home: shows the active child's stars, streak, time left, this week, and the game tiles.
import { tileState, type TileState } from "../../core/dailyPlan.ts";
import { streakToday, weekStrip } from "../../core/profiles.ts";
import type { GameId } from "../../core/types.ts";
import { GAMES } from "../../games/index.ts";
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { mountAdultGate } from "../adultGate.ts";
import { avatarBadge } from "../avatars.ts";
import { emoji, h } from "../dom.ts";
import { mascot } from "../mascot.ts";
import { showToast } from "../notices.ts";
import type { ScreenDef } from "../router.ts";
import { speakerButton } from "../topbar.ts";
import "./home.css";

/** The picture in the middle of each tile (matches mockup/v2/index.html). */
function tileArt(id: GameId): HTMLElement {
  const art = h("div", { class: "art" });
  switch (id) {
    case "scale":
      art.append(emoji("balance_scale", 112));
      break;
    case "robot":
      art.append(emoji("robot", 104), emoji("triangular_flag", 54));
      break;
    case "basket": {
      const orange = emoji("tangerine", 54);
      orange.style.marginRight = "-18px";
      art.append(orange, emoji("basket", 108));
      break;
    }
    case "equations":
      art.classList.add("eqart");
      art.append(emoji("red_apple", 64), "+", emoji("pear", 64), "=?");
      break;
    case "split": {
      const sun = emoji("sunflower", 78);
      const small = emoji("tulip", 60);
      sun.style.marginLeft = "-14px";
      small.style.marginLeft = "-12px";
      art.append(emoji("tulip", 78), sun, small);
      break;
    }
    case "pattern":
      art.classList.add("eqart");
      art.append(emoji("red_apple", 56), emoji("pear", 56), emoji("red_apple", 56), "?");
      break;
  }
  return art;
}

/** The small label that tells a child what a tile is doing today (see core/dailyPlan.ts). */
function stateBadge(state: TileState): HTMLElement {
  switch (state) {
    case "next": return h("span", { class: "state next" }, emoji("magnifying_glass_tilted_left", 18), STR.tileNext);
    case "done": return h("span", { class: "state done" }, "✓", STR.tileDone);
    case "later": return h("span", { class: "state later" }, emoji("locked", 18), STR.tileLater);
    default: return h("span", { class: "state notToday" }, emoji("locked", 18), STR.tileNotToday);
  }
}

export const homeScreen: ScreenDef = {
  bg: "--home-bg",
  mount({ ctx, screen }) {
    const profile = ctx.store.activeProfile;
    if (!profile) {
      ctx.go("who");
      return;
    }
    screen.classList.add("screen-home");
    const settings = ctx.store.data.settings;
    const today = ctx.today();
    const plan = ctx.dailyPlan();
    const minutesLeft = Math.ceil(ctx.time.dailyLeftMs() / 60000);
    // Dev only: "?allready" shows every tile as playable to review how ready tiles look.
    const allReady = import.meta.env.DEV && location.search.includes("allready");

    const meChip = h("button", { class: "me-chip", id: "who-chip", title: STR.changeKid, onclick: () => ctx.go("who") }, avatarBadge(profile.avatar, 58), profile.name);
    const meo = mascot("detective");
    meo.addEventListener("click", () => void ctx.voice.play(say("hello", "help_today")));

    const chip = (cls: string, icon: string, text: string) => h("span", { class: `chip ${cls}` }, emoji(icon, 34), text);
    const timeChip = chip("time", "hourglass_not_done", STR.timeChip(minutesLeft));
    const week = weekStrip(profile, today, settings).map(({ day, status }, i) =>
      h("span", { class: [status === "star" ? "ok" : "", status === "off" ? "off" : "", day === today ? "is-today" : ""].join(" ").trim() }, STR.weekdays[i]),
    );

    const hero = h("section", { class: "hero card" },
      meo,
      h("div", { class: "words" },
        h("h2", { id: "greeting" }, STR.greeting(profile.name)),
        h("p", null, say("help_today").text),
        h("div", { class: "chips" },
          chip("star", "glowing_star", STR.starsChip(profile.stars)),
          chip("fire", "fire", STR.streakChip(streakToday(profile, today, settings))),
          timeChip)),
      h("div", { class: "week-card" }, h("b", null, STR.thisWeek), h("div", { class: "week" }, ...week)));

    // a game that has to wait: Mèo says why, and the game that is open lights up
    let nudgeTimer = 0;
    const explainLocked = (state: TileState) => {
      const line = say(state === "later" ? "plan_wait" : "plan_tomorrow");
      showToast(ctx.stage.el, line.text, "think", 5000);
      void ctx.voice.play(line);
      if (state === "later") {
        const next = screen.querySelector<HTMLElement>(".tile[data-state=next]");
        next?.classList.add("nudge");
        clearTimeout(nudgeTimer);
        nudgeTimer = window.setTimeout(() => next?.classList.remove("nudge"), 1800);
      }
    };
    const tiles = GAMES.map((g) => {
      const progress = profile.games[g.id];
      const ready = g.ready || allReady;
      const state: TileState = ready ? tileState(plan, g.id) : "open";
      const waiting = state === "later" || state === "notToday";
      const tile = h("button", { class: `tile${ready ? "" : " soon"} state-${state}`, "data-game": g.id, "data-state": state, "aria-disabled": ready && !waiting ? null : "true" },
        h("span", { class: "lvl" }, STR.tier(progress.seed.tier)));
      if (ready && state !== "open") tile.append(stateBadge(state));
      tile.style.background = `var(${g.tileVar})`;
      if (!ready) {
        tile.append(h("span", { class: "soon-badge" }, emoji("locked", 18), STR.tileSoon));
      } else if (progress.sets === 0) {
        tile.append(h("span", { class: "new" }, STR.tileNew));
      } else {
        tile.append(h("span", { class: "got" }, ...[0, 1, 2].map((i) => emoji("star", 26, i < progress.bestStars ? "" : "dim"))));
      }
      tile.append(tileArt(g.id), h("h3", null, g.title));
      if (ready) tile.addEventListener("click", () => (waiting ? explainLocked(state) : ctx.go(`play/${g.id}`)));
      return tile;
    });

    screen.append(
      h("header", { class: "top" }, emoji("magnifying_glass_tilted_left", 52), h("h1", null, STR.appTitle),
        plan ? chip("plan", "magnifying_glass_tilted_left", STR.planChip(plan.done.length, plan.games.length)) : null, meChip, speakerButton()),
      hero,
      h("nav", { class: "grid" }, ...tiles),
    );
    const stopGate = mountAdultGate(screen, () => ctx.go("teacher"));
    // keep "còn N phút" in step with the clock
    const unsubscribe = ctx.time.subscribe(() => {
      const text = STR.timeChip(Math.ceil(ctx.time.dailyLeftMs() / 60000));
      if (timeChip.lastChild && timeChip.lastChild.textContent !== text) timeChip.lastChild.textContent = text;
    });
    return () => {
      clearTimeout(nudgeTimer);
      unsubscribe();
      stopGate();
      ctx.voice.stop();
    };
  },
};
