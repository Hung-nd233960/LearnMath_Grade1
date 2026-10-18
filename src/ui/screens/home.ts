// Home: shows the active child's stars, streak, time left, this week, and the game tiles.
import { streakToday, weekStrip } from "../../core/profiles.ts";
import type { GameId } from "../../core/types.ts";
import { GAMES } from "../../games/index.ts";
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { mountAdultGate } from "../adultGate.ts";
import { avatarBadge } from "../avatars.ts";
import { emoji, h } from "../dom.ts";
import { mascot } from "../mascot.ts";
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

    const tiles = GAMES.map((g) => {
      const progress = profile.games[g.id];
      const ready = g.ready || allReady;
      const tile = h("button", { class: `tile${ready ? "" : " soon"}`, "data-game": g.id, "aria-disabled": ready ? null : "true" },
        h("span", { class: "lvl" }, STR.tier(progress.seed.tier)));
      tile.style.background = `var(${g.tileVar})`;
      if (!ready) {
        tile.append(h("span", { class: "soon-badge" }, emoji("locked", 18), STR.tileSoon));
      } else if (progress.sets === 0) {
        tile.append(h("span", { class: "new" }, STR.tileNew));
      } else {
        tile.append(h("span", { class: "got" }, ...[0, 1, 2].map((i) => emoji("star", 26, i < progress.bestStars ? "" : "dim"))));
      }
      tile.append(tileArt(g.id), h("h3", null, g.title));
      if (ready) tile.addEventListener("click", () => ctx.go(`play/${g.id}`));
      return tile;
    });

    screen.append(
      h("header", { class: "top" }, emoji("magnifying_glass_tilted_left", 52), h("h1", null, STR.appTitle), meChip, speakerButton()),
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
      unsubscribe();
      stopGate();
      ctx.voice.stop();
    };
  },
};
