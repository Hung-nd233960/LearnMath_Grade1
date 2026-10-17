// A break between sets: Mèo sleeps and a countdown runs. It ends by itself (the app then goes home).
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { mountAdultGate } from "../adultGate.ts";
import { emoji, h } from "../dom.ts";
import { mascot } from "../mascot.ts";
import type { ScreenDef } from "../router.ts";
import { formatClock } from "../timekeeper.ts";
import "./timeout.css";

export const breakScreen: ScreenDef = {
  bg: "--break-bg",
  decor: "break",
  mount({ ctx, screen }) {
    // Only a real break is shown: if none is due or running, there is nothing to rest from.
    if (!ctx.time.ensureBreak()) {
      ctx.go("home");
      return;
    }
    screen.classList.add("screen-break");
    const limits = ctx.store.data.settings.limits;
    const clock = h("span", { id: "break-clock" }, formatClock(ctx.time.snapshot()?.breakLeftMs ?? 0));
    screen.append(
      h("div", { class: "center" },
        mascot("sleep"),
        h("h1", null, STR.breakTitle),
        h("p", null, STR.breakBody(Math.round(limits.sessionMin))),
        h("div", { class: "clock" }, emoji("hourglass_not_done", 64), clock),
        h("div", { class: "tips" },
          h("div", null, emoji("seedling", 34), STR.breakTipFar),
          h("div", null, emoji("sparkles", 34), STR.breakTipStretch)),
        h("button", { class: "other-kid", id: "other-kid", onclick: () => ctx.go("who") }, STR.otherKid)),
    );
    const stopGate = mountAdultGate(screen, () => ctx.go("teacher"));
    const unsubscribe = ctx.time.subscribe((r) => { clock.textContent = formatClock(r.breakLeftMs); });
    void ctx.voice.play(say("break_start"));
    return () => {
      unsubscribe();
      stopGate();
      ctx.voice.stop();
    };
  },
};
