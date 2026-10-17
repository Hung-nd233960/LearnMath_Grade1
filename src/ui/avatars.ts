// Round profile pictures: a Fluent Emoji on a soft colour. The stems come from AVATARS in core/profiles.ts.
import { emoji, h } from "./dom.ts";

const AVATAR_COLORS: Record<string, string> = {
  rocket: "#e3dafb",
  rainbow: "#d9f0ff",
  strawberry: "#ffe0e6",
  soccer_ball: "#dff3e4",
  sun_with_face: "#fff1c7",
  kite: "#ffe3d3",
  cherry_blossom: "#fde3ef",
  star: "#fff4cc",
  teddy_bear: "#f3e2d0",
  seedling: "#e0f2d9",
};

export function avatarColor(stem: string): string {
  return AVATAR_COLORS[stem] ?? "#e3dafb";
}

export function avatarBadge(stem: string, size: number): HTMLElement {
  const el = h("span", { class: "av" }, emoji(stem, Math.round(size * 0.7)));
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;background:${avatarColor(stem)};flex:none`;
  return el;
}
