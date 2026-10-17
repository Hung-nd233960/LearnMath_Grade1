// "Ai đang chơi hôm nay?": pick which child is playing (or add one). Pages of 8 tiles.
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { avatarBadge } from "../avatars.ts";
import { h } from "../dom.ts";
import { ICON } from "../icons.ts";
import { mascot } from "../mascot.ts";
import { clampPage, paginate } from "../paginate.ts";
import type { ScreenDef } from "../router.ts";
import { openAddProfile } from "./addProfile.ts";
import "./who.css";

const PER_PAGE = 8;

export const whoScreen: ScreenDef = {
  bg: "--home-bg",
  mount({ ctx, screen }) {
    screen.classList.add("screen-who");
    let page = 0;

    const title = h("h1");
    const sub = h("p");
    const kids = h("div", { class: "kids" });
    const pager = h("div", { class: "pager" });
    screen.append(
      h("div", { class: "head" }, mascot("normal"), h("div", null, title, sub)),
      kids,
      pager,
      h("div", { class: "note" }, STR.whoNote),
    );

    const choose = (id: string) => {
      ctx.voice.unlock();
      ctx.store.setActive(id);
      ctx.go("home");
    };
    const add = () => openAddProfile(ctx, () => { page = Infinity; render(); });

    const render = () => {
      const { profiles, order } = ctx.store.data;
      const empty = order.length === 0;
      title.textContent = empty ? STR.welcomeTitle : STR.whoTitle;
      sub.textContent = empty ? STR.welcomeSub : STR.whoSub;

      const tiles = order.map((id) => {
        const p = profiles[id]!;
        return h("button", { class: "kid", "data-profile": id, onclick: () => choose(id) }, avatarBadge(p.avatar, 130), h("b", null, p.name));
      });
      tiles.push(h("button", { class: "kid add", id: "add-friend", onclick: add }, h("span", { class: "plus" }, "+"), h("b", null, STR.addFriend)));

      const pages = paginate(tiles, PER_PAGE);
      page = clampPage(page, pages.length);
      kids.replaceChildren(...pages[page]!);

      pager.replaceChildren();
      if (pages.length > 1) {
        const prev = h("button", { class: "btn-round", id: "page-prev", title: STR.prevPage, onclick: () => { page--; render(); } });
        prev.innerHTML = ICON.back;
        const next = h("button", { class: "btn-round", id: "page-next", title: STR.nextPage, onclick: () => { page++; render(); } });
        next.innerHTML = ICON.back;
        next.style.transform = "scaleX(-1)";
        prev.disabled = page === 0;
        next.disabled = page === pages.length - 1;
        pager.append(prev, h("div", { class: "dots" }, ...pages.map((_, i) => h("span", { class: i === page ? "now" : "" }))), next);
      }
    };
    render();

    // Redraw only when the list of children changes (not when e.g. the mute switch is toggled).
    const signature = () => ctx.store.data.order.map((id) => { const p = ctx.store.data.profiles[id]!; return `${id}|${p.name}|${p.avatar}`; }).join(";");
    let seen = signature();
    const unsubscribe = ctx.store.subscribe(() => {
      const now = signature();
      if (now !== seen) { seen = now; render(); }
    });

    // First run: nobody exists yet, so go straight to the "add" form. Otherwise greet.
    if (ctx.store.data.order.length === 0) add();
    else void ctx.voice.play(say("who_plays"));

    return () => {
      unsubscribe();
      ctx.voice.stop();
    };
  },
};
