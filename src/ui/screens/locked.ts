// The daily limit is reached: a calm night screen until tomorrow (or until an adult grants more time).
import { starsToday, streakToday } from "../../core/profiles.ts";
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { mountAdultGate } from "../adultGate.ts";
import { emoji, h } from "../dom.ts";
import { mascot } from "../mascot.ts";
import type { ScreenDef } from "../router.ts";
import "./timeout.css";

export const lockedScreen: ScreenDef = {
  bg: "--night-bg",
  decor: "locked",
  mount({ ctx, screen }) {
    const profile = ctx.store.activeProfile;
    const snap = ctx.time.snapshot();
    if (!profile || !snap?.lockDue) {
      ctx.go("home"); // nothing is locked: do not show a lock screen
      return;
    }
    screen.classList.add("screen-locked");
    ctx.stage.el.classList.add("night");
    const today = ctx.today();
    const settings = ctx.store.data.settings;
    const stars = starsToday(profile, today);
    const streak = streakToday(profile, today, settings);
    const playedMin = Math.round(ctx.time.playedMs() / 60000);
    screen.append(
      h("div", { class: "center" },
        mascot("sleep"),
        h("h1", null, STR.lockedTitle),
        h("p", null, STR.lockedBody(playedMin, stars)),
        h("div", { class: "tips" },
          h("div", null, emoji("glowing_star", 34), STR.starsToday(stars)),
          streak > 0 ? h("div", null, emoji("fire", 34), STR.streakChip(streak)) : null),
        h("button", { class: "other-kid", id: "other-kid", onclick: () => ctx.go("who") }, STR.otherKid)),
    );
    const stopGate = mountAdultGate(screen, () => ctx.go("teacher"));
    // an adult grants more time, or a new day starts: leave the lock screen
    const unsubscribe = ctx.time.subscribe((r) => { if (!r.lockDue) ctx.go("home"); });
    void ctx.voice.play(say("daily_done"));
    return () => {
      unsubscribe();
      stopGate();
      ctx.stage.el.classList.remove("night");
      ctx.voice.stop();
    };
  },
};
