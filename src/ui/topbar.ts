// The bar at the top of a game screen: back, "Vòng N" + progress dots, (i) guide, speaker.
// The speaker is also used on the home screen. It only draws: app.ts handles the click.
import { STR } from "../i18n/ui.ts";
import { h, html } from "./dom.ts";
import { ICON } from "./icons.ts";

/** Round speaker button holding both icons; <html class="is-muted"> picks which one shows. */
export function speakerButton(): HTMLElement {
  const b = h("button", { class: "btn-round dark speaker", "data-speaker": true, title: STR.sound });
  b.append(html(`<span class="i-on">${ICON.sound}</span>`), html(`<span class="i-off">${ICON.mute}</span>`));
  return b;
}

export function backButton(onBack: () => void): HTMLElement {
  const b = h("button", { class: "btn-round", title: STR.backHome, onclick: onBack });
  b.innerHTML = ICON.back;
  return b;
}

export interface TopbarOptions {
  onBack(): void;
  /** Show the (i) guide button when provided. */
  onInfo?: () => void;
  tier: number;
  /** 0-based number of the current question, and how many questions in the set. */
  index: number;
  length: number;
}

export interface Topbar {
  el: HTMLElement;
  /** Update the tier badge and dots as the set advances. index >= length marks every dot done. */
  setProgress(tier: number, index: number, length: number): void;
}

export function topbar(o: TopbarOptions): Topbar {
  const badge = h("span", { class: "tier-badge" });
  const dots = h("div", { class: "dots" });
  const right = h("div", { class: "right" });
  if (o.onInfo) right.append(h("button", { class: "btn-round info", title: STR.guideButton, onclick: o.onInfo }, "i"));
  right.append(speakerButton());

  const setProgress = (tier: number, index: number, length: number) => {
    badge.textContent = STR.tier(tier);
    dots.replaceChildren(...Array.from({ length }, (_, i) => h("span", { class: i < index ? "done" : i === index ? "now" : "" })));
  };
  setProgress(o.tier, o.index, o.length);

  const el = h("div", { class: "topbar" }, backButton(o.onBack), h("div", { class: "mid" }, badge, dots), right);
  return { el, setProgress };
}
