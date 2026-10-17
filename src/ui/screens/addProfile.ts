// The "Thêm bạn mới" form: a name and a picture. Used by the who screen (and later the teacher area).
import { AVATARS, type Profile } from "../../core/profiles.ts";
import { STR } from "../../i18n/ui.ts";
import { avatarBadge } from "../avatars.ts";
import type { AppContext } from "../context.ts";
import { h } from "../dom.ts";
import { openOverlay, type Overlay } from "../overlay.ts";
import "./addProfile.css";

const MAX_NAME = 20;

export function openAddProfile(ctx: AppContext, onAdded: (p: Profile) => void): Overlay {
  let avatar: string = AVATARS[0];
  const input = h("input", {
    class: "name-input", type: "text", maxlength: MAX_NAME, placeholder: STR.namePlaceholder,
    autocomplete: "off", autocapitalize: "words", enterkeyhint: "done", "aria-label": STR.namePlaceholder,
  });
  const ok = h("button", { class: "btn btn-primary" }, STR.done);
  ok.disabled = true;

  const options = AVATARS.map((stem) => {
    const b = h("button", { class: "av-opt", "data-avatar": stem, "aria-label": stem }, avatarBadge(stem, 76));
    b.addEventListener("click", () => {
      avatar = stem;
      options.forEach((o) => o.classList.toggle("on", o === b));
    });
    return b;
  });
  options[0]!.classList.add("on");

  const card = h("div", { class: "card add-card" },
    h("h2", null, STR.addTitle),
    input,
    h("p", { class: "add-label" }, STR.pickAvatar),
    h("div", { class: "av-grid" }, ...options),
    h("div", { class: "add-actions" }, h("button", { class: "btn btn-secondary", "data-close": true }, STR.cancel), ok));

  const overlay = openOverlay(ctx.stage.el, card);
  overlay.el.classList.add("overlay-top");

  const submit = () => {
    const name = input.value.trim();
    if (!name) return;
    const profile = ctx.store.addProfile(name, avatar, ctx.now());
    overlay.close();
    onAdded(profile);
  };
  input.addEventListener("input", () => (ok.disabled = input.value.trim() === ""));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  ok.addEventListener("click", submit);
  requestAnimationFrame(() => input.focus());
  return overlay;
}
