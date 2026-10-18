// The subject in the middle of each home tile, drawn on top of its scene (see scene.ts). Each is a small group of
// Fluent Emoji and inline SVG; "peek" is Mèo looking out from the left corner on the two detective games.
import type { GameId } from "../core/types.ts";
import { emoji, h, html } from "./dom.ts";
import { mascot } from "./mascot.ts";

/** The golden scale with a smiling face and a star on top (Thăng bằng). */
const SCALE_FACE = `<svg width="150" height="116" viewBox="0 0 150 116">
  <path d="M75 8 l4.6 9.4 10.4 1.5 -7.5 7.3 1.8 10.3 -9.3 -4.9 -9.3 4.9 1.8 -10.3 -7.5 -7.3 10.4 -1.5 Z" fill="#ffd34e" stroke="#c98a1e" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M10 46 Q75 26 140 46" stroke="#b97a1a" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M10 46 Q75 26 140 46" stroke="#f6c24a" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <path d="M18 48 L8 80 M18 48 L34 80 M132 48 L116 80 M132 48 L142 80" stroke="#8a6526" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 4"/>
  <path d="M0 80 H42 Q40 94 21 94 Q2 94 0 80 Z" fill="#f6c24a" stroke="#b97a1a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M108 80 H150 Q148 94 129 94 Q110 94 108 80 Z" fill="#f6c24a" stroke="#b97a1a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M62 36 H88 L94 96 H56 Z" fill="#f6c24a" stroke="#b97a1a" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="75" cy="102" rx="34" ry="9" fill="#f08a5d" stroke="#b9552e" stroke-width="3"/>
  <circle cx="68" cy="58" r="3.4" fill="#1e2a4a"/><circle cx="82" cy="58" r="3.4" fill="#1e2a4a"/><circle cx="69.2" cy="56.8" r="1.1" fill="#fff"/><circle cx="83.2" cy="56.8" r="1.1" fill="#fff"/>
  <path d="M69 65 q6 7 12 0" stroke="#1e2a4a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="62" cy="64" rx="4" ry="2.6" fill="#ff8c8c" opacity=".7"/><ellipse cx="88" cy="64" rx="4" ry="2.6" fill="#ff8c8c" opacity=".7"/></svg>`;

/** A smiling face for the basket emoji (Chia quả). */
const BASKET_FACE = `<svg width="108" height="108" viewBox="0 0 108 108" style="position:absolute;left:0;top:0">
  <circle cx="42" cy="68" r="4" fill="#1e2a4a"/><circle cx="66" cy="68" r="4" fill="#1e2a4a"/><circle cx="43.4" cy="66.6" r="1.3" fill="#fff"/><circle cx="67.4" cy="66.6" r="1.3" fill="#fff"/>
  <path d="M47 76 q7 8 14 0" stroke="#1e2a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="35" cy="75" rx="5" ry="3" fill="#ff8c8c" opacity=".7"/><ellipse cx="73" cy="75" rx="5" ry="3" fill="#ff8c8c" opacity=".7"/></svg>`;

/** ● ▲ ● ▲ ● ? on a wooden board (Quy luật). */
const PATTERN_BOARD = `<svg width="236" height="78" viewBox="0 0 236 78">
  <rect x="3" y="8" width="230" height="62" rx="14" fill="#fff8e6" stroke="#c98a4f" stroke-width="5"/>
  <circle cx="32" cy="39" r="14" fill="#ef5b5b" stroke="#1e2a4a" stroke-width="3"/>
  <path d="M68 25 L82 52 H54 Z" fill="#ffd34e" stroke="#1e2a4a" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="108" cy="39" r="14" fill="#ef5b5b" stroke="#1e2a4a" stroke-width="3"/>
  <path d="M144 25 L158 52 H130 Z" fill="#ffd34e" stroke="#1e2a4a" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="184" cy="39" r="14" fill="#ef5b5b" stroke="#1e2a4a" stroke-width="3"/>
  <rect x="206" y="23" width="22" height="32" rx="6" fill="#fff" stroke="#8da2c8" stroke-width="3" stroke-dasharray="4 3"/>
  <text x="217" y="48" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="24" fill="#1e2a4a">?</text>
  <path d="M118 3 l3 6 6.4 1 -4.7 4.5 1.1 6.4 -5.8 -3 -5.8 3 1.1 -6.4 -4.7 -4.5 6.4 -1 Z" fill="#ffd34e" stroke="#c98a1e" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

/** Mèo looking out from the left corner. */
function peek(): HTMLElement {
  const m = mascot("detective");
  m.classList.add("peek");
  return m;
}

/** The picture in the middle of a tile. */
export function tileArt(id: GameId): HTMLElement {
  const art = h("div", { class: "art" });
  switch (id) {
    case "scale":
      art.append(html(SCALE_FACE));
      break;
    case "robot":
      art.append(emoji("robot", 92), emoji("triangular_flag", 50));
      break;
    case "basket": {
      const basket = h("div", { class: "face-basket" }, emoji("basket", 108), html(BASKET_FACE));
      const apple = emoji("red_apple", 52), orange = emoji("tangerine", 50), grapes = emoji("grapes", 48);
      apple.style.marginRight = "-14px";
      orange.style.marginLeft = "-12px";
      art.append(apple, basket, orange, grapes);
      break;
    }
    case "equations":
      art.classList.add("eqart", "on-board");
      art.append(h("div", { class: "tile-board" }, emoji("red_apple", 50), "+", emoji("pear", 50), "=?"), peek());
      break;
    case "split":
      art.append(emoji("rabbit", 90), emoji("baby_chick", 64));
      break;
    case "pattern":
      art.classList.add("on-board");
      art.append(html(PATTERN_BOARD), peek());
      break;
  }
  return art;
}
