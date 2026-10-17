// The "Thêm bạn mới" form: a name and a picture. Used by the who screen and the teacher area,
// which also uses it to rename a child or change their picture.
import { AVATARS, type Profile } from "../../core/profiles.ts";
import { STR } from "../../i18n/ui.ts";
import { avatarBadge } from "../avatars.ts";
import type { AppContext } from "../context.ts";
import { h } from "../dom.ts";
import { openOverlay, type Overlay } from "../overlay.ts";
import "./addProfile.css";

const MAX_NAME = 20;

interface FormOptions {
  title: string;
  name: string;
  avatar: string;
  onSubmit(name: string, avatar: string): void;
}

function openProfileForm(ctx: AppContext, o: FormOptions): Overlay {
  let avatar = o.avatar;
  const input = h("input", {
    class: "name-input", type: "text", maxlength: MAX_NAME, placeholder: STR.namePlaceholder,
    autocomplete: "off", autocapitalize: "words", enterkeyhint: "done", "aria-label": STR.namePlaceholder,
  });
  input.value = o.name;
  const ok = h("button", { class: "btn btn-primary" }, STR.done);
  ok.disabled = input.value.trim() === "";

  const options = AVATARS.map((stem) => {
    const b = h("button", { class: "av-opt", "data-avatar": stem, "aria-label": stem }, avatarBadge(stem, 76));
    b.classList.toggle("on", stem === avatar);
    b.addEventListener("click", () => {
      avatar = stem;
      options.forEach((x) => x.classList.toggle("on", x === b));
    });
    return b;
  });
  if (!options.some((b) => b.classList.contains("on"))) options[0]!.classList.add("on");

  const card = h("div", { class: "card add-card" },
    h("h2", null, o.title),
    input,
    h("p", { class: "add-label" }, STR.pickAvatar),
    h("div", { class: "av-grid" }, ...options),
    h("div", { class: "add-actions" }, h("button", { class: "btn btn-secondary", "data-close": true }, STR.cancel), ok));

  const overlay = openOverlay(ctx.stage.el, card);
  overlay.el.classList.add("overlay-top");

  const submit = () => {
    const name = input.value.trim();
    if (!name) return;
    overlay.close();
    o.onSubmit(name, avatar);
  };
  input.addEventListener("input", () => (ok.disabled = input.value.trim() === ""));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  ok.addEventListener("click", submit);
  requestAnimationFrame(() => input.focus());
  return overlay;
}

export function openAddProfile(ctx: AppContext, onAdded: (p: Profile) => void): Overlay {
  return openProfileForm(ctx, {
    title: STR.addTitle,
    name: "",
    avatar: AVATARS[0],
    onSubmit: (name, avatar) => onAdded(ctx.store.addProfile(name, avatar, ctx.now())),
  });
}

/** Teacher area: change a child's name or picture (progress is kept). */
export function openEditProfile(ctx: AppContext, profile: Profile, onSaved: () => void): Overlay {
  return openProfileForm(ctx, {
    title: STR.teacher.editTitle,
    name: profile.name,
    avatar: profile.avatar,
    onSubmit: (name, avatar) => {
      ctx.store.patchProfile(profile.id, (p) => ({ ...p, name: name.trim().slice(0, MAX_NAME), avatar }));
      onSaved();
    },
  });
}
